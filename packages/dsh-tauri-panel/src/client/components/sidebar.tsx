import type { CSSProperties, ReactElement } from 'react'
import type { PanelListEntry, SidebarRootProps } from '../types'
import { SlotOutlet } from '@deepseek-ai/dsh-client-ui-renderer'
import { CommentPlus, FishMark, Icon, useMountStyle } from 'dsh-tauri-ui/client'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ACTION_ITEM_STYLE_ID, COLLAPSE_SETTLE_MS, PANEL_ACTION_SLOT, PANEL_DATA_ATTRIBUTES, PANEL_SIDEBAR_COMPAT_CLASS, SCROLLBAR_LINGER_MS, SIDEBAR_STYLE_ID } from '../constants'
import actionItemStyle from './action-item.cssr'
import { PanelRow } from './panel-row'
import sidebarStyle from './sidebar.cssr'

/**
 * components/sidebar.tsx — sidebar 槽整槽替换的克隆组件（priority -1 shadow 官方
 * ui-sidebar）；安装器见 register/sidebar.ts。
 *
 * 结构为官方 SidebarRoot（dsh-client-ui-sidebar 0.1.5-rc.1 / rc.2，左侧边栏能力集
 * 一致）的克隆，改动点：
 *   - logoRow 高度 60px → 32px、底部间距 8px → 4px（需求①②）；
 *   - 「新会话」按钮从 logoRow 下方移入**面板区**（需求③），样式镜像官方
 *     ui-sidebar 的 New Session 按钮（elevated-fill 白底 + 12px 圆角；
 *     独立类自给自足，不挂 menu-item，避免与面板区条目样式互相覆盖）；
 *   - 面板区 = 新会话菜单项 + **官方全局面板行**（`sidebar.panellist`，
 *     0.1.5-rc.1 起提供；见 components/panel-row.tsx）+ 私有协议功能项
 *     （槽 `sidebar.panel.action`，list/root，本条目 children 声明，协议⑤，
 *     见 PROTOCOL.md）。
 *
 * 渲染官方子槽（brand.mark/brand.name/workspaces/footer.action/settings）一律
 * 走 <SlotOutlet>（无 children 所有权检查）：官方条目仍 live（被 shadow），
 * 其 children 声明与 locale 注册继续生效；本条目**只**声明新增槽
 * sidebar.panel.action（子槽 key 全局唯一，绝不重声明官方子槽）。
 *
 * 交互行为镜像官方：折叠 settled（COLLAPSE_SETTLE_MS=150）→ wide 判定、
 * rail-in/fading 动画类、滚动条 linger（quietBars）。
 *
 * 样式：sidebar.cssr（壳与面板区几何）+ **action-item.cssr**（`.dshp-panel__menu-item`
 * 行样式，本组件与 PanelActionItem 共用；见组件内注释）。
 */

/** 简易 classnames 拼接。 */
function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** 克隆的 SidebarRoot：紧凑 logoRow + 面板区（官方全局面板 + 私有功能项）+ 官方子槽透传。 */
export function SidebarRootClone({ collapsed, width, startSession, toggleSidebar, selectPanel, panels, usePanelInfo, t }: SidebarRootProps): ReactElement {
  const [settled, setSettled] = useState(false)
  useMountStyle(sidebarStyle, SIDEBAR_STYLE_ID)
  // 面板行的 `.dshp-panel__menu-item`（行 + 图标 + 文案）定义在 action-item.cssr，
  // 历史上只由 PanelActionItem 组件挂载。0.1.5-rc.1 起面板改由官方
  // `sidebar.panellist` + `main` 承载，克隆侧栏**自己**渲染这些行
  // （components/panel-row.tsx），再没人挂这份样式就会退化成浏览器默认按钮外观。
  // 因此由克隆侧栏统一挂一份（mountStyle 引用计数幂等，与 PanelActionItem 的挂载
  // 互不冲突，两边都只挂一次）。
  useMountStyle(actionItemStyle, ACTION_ITEM_STYLE_ID)
  // 官方 `sidebar.panellist` 的行投影（宿主注入的 store；旧核心恒为空表）。
  const panelRows = useSyncExternalStore<PanelListEntry[]>(panels.subscribe, panels.getSnapshot)
  useEffect(() => {
    setSettled(false)
    const timer = window.setTimeout(() => {
      setSettled(true)
    }, COLLAPSE_SETTLE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [collapsed])

  const wide = !collapsed || !settled
  const lastWideWidth = useRef(width)
  if (!collapsed)
    lastWideWidth.current = width
  const everWide = useRef(!collapsed)
  if (!collapsed)
    everWide.current = true

  // 滚动条 linger：指针进入取消计时，离开后 2s 把滚动条 thumb 变透明。
  const [pointerInside, setPointerInside] = useState(false)
  const lingerTimer = useRef<number | undefined>(undefined)
  const armLinger = (): void => {
    if (lingerTimer.current !== undefined)
      return
    lingerTimer.current = window.setTimeout(() => {
      lingerTimer.current = undefined
      setPointerInside(false)
    }, SCROLLBAR_LINGER_MS)
  }
  const cancelLinger = (): void => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = undefined
  }

  return (
    <div
      className={cx(
        'dshp-panel',
        !wide && 'dshp-panel--collapsed',
        !wide && everWide.current && 'dshp-panel--rail-in',
        collapsed && wide && 'dshp-panel--fading',
        !pointerInside && 'dshp-panel--quiet-bars',
        wide && 'dshp-panel--wide',
      )}
      {...{ [PANEL_DATA_ATTRIBUTES.sidebar]: '' }}
      style={wide ? { '--dshp-width': `${collapsed ? lastWideWidth.current : width}px` } as CSSProperties : undefined}
      onPointerEnter={() => {
        cancelLinger()
        setPointerInside(true)
      }}
      onPointerLeave={() => {
        armLinger()
      }}
    >
      <div className="dshp-panel__logo-row">
        {wide && (
          <button
            type="button"
            className="dshp-panel__brand"
            aria-label={t('session.new.label')}
            onClick={() => {
              console.warn('[dsh-tauri-panel] new session requested', { source: 'brand' })
              try {
                startSession()
              }
              catch (error) {
                console.error('[dsh-tauri-panel] new session failed', error)
              }
            }}
          >
            <span className="dshp-panel__brand-identity" aria-hidden="true">
              <span className="dshp-panel__brand-mark">
                <SlotOutlet
                  slotKey="sidebar.brand.mark"
                  ownerProps={{ size: 24 }}
                  opts={{ fallback: <Icon as={FishMark} size={24} /> }}
                />
              </span>
              <span className="dshp-panel__brand-name">
                <SlotOutlet
                  slotKey="sidebar.brand.name"
                  ownerProps={{}}
                  opts={{ fallback: <span className="dshp-panel__fallback-brand-name">DSH Local Build</span> }}
                />
              </span>
            </span>
          </button>
        )}
        <button
          type="button"
          className={`${'dshp-panel__icon-button'} ${'dshp-panel__toggle'}`}
          aria-label={collapsed ? t('toggle.open') : t('toggle.collapse')}
          title={collapsed ? t('toggle.open') : t('toggle.collapse')}
          onClick={() => toggleSidebar()}
        >
          {!wide && (
            <span className="dshp-panel__rail-mark" aria-hidden="true">
              <SlotOutlet
                slotKey="sidebar.brand.mark"
                ownerProps={{ size: 24 }}
                opts={{ fallback: <Icon as={FishMark} size={24} /> }}
              />
            </span>
          )}
        </button>
      </div>
      <div className={`${'dshp-panel__panel-area'} ${PANEL_SIDEBAR_COMPAT_CLASS.logoRow}`}>
        <button
          type="button"
          className={`${'dshp-panel__new-session'} ${PANEL_SIDEBAR_COMPAT_CLASS.newSession}`}
          title={t('session.new.label')}
          onClick={() => {
            console.warn('[dsh-tauri-panel] new session requested', { source: 'menu' })
            try {
              startSession()
            }
            catch (error) {
              console.error('[dsh-tauri-panel] new session failed', error)
            }
          }}
        >
          <span className="dshp-panel__menu-item-icon"><Icon as={CommentPlus} size={wide ? 14 : 18} /></span>
          <span className="dshp-panel__menu-item-label">{t('session.new')}</span>
        </button>
        {/* 官方全局面板（sidebar.panellist）：无注册时整块不渲染，连间距都不占
            （对齐官方 SidebarRoot 的 `panels.length > 0 &&` 行为）。 */}
        {panelRows.length > 0 && (
          <nav className="dshp-panel__panel-list" aria-label={t('panels.label')}>
            {panelRows.map(row => (
              <PanelRow
                key={row.id}
                id={row.id}
                label={row.label}
                wide={wide}
                usePanelInfo={usePanelInfo}
                selectPanel={selectPanel}
              />
            ))}
          </nav>
        )}
        <SlotOutlet slotKey={PANEL_ACTION_SLOT} ownerProps={{ wide }} />
      </div>

      <div className="dshp-panel__region-area">
        <SlotOutlet
          slotKey="sidebar.workspaces"
          ownerProps={{
            wide,
            expandSidebar: () => {
              if (collapsed)
                toggleSidebar()
            },
          }}
        />
      </div>

      <div className="dshp-panel__foot-area">
        <div className="dshp-panel__footer-actions">
          <SlotOutlet slotKey="sidebar.footer.action" ownerProps={{ wide }} />
        </div>
        <div className="dshp-panel__settings-area">
          <SlotOutlet slotKey="sidebar.settings" ownerProps={{ wide }} />
        </div>
      </div>
    </div>
  )
}
