/**
 * styles/index.ts — 桌宠侧栏入口 + 设置分区样式（css-render，apply() effect 内 mount）。
 *
 * 侧栏入口按钮复刻官方 `.rtSEdW_iconButton`（appearance/color/border-radius/
 * padding/hover/focus-visible 与 data-tip 气泡），并叠加右上角绿色激活圆点；
 * 设置行布局复刻新版 dsh 客户端 SettingsRoot 的 triggerRow（flex 行 + gap，
 * 齿轮与行内图标同一行）——规则全部拆成单选择器（不依赖 data-slot 包裹层，
 * 由补丁直接给宿主加 .dshp-pet__settings-row 并同步内联样式兜底）；
 * 设置分区遵循 issue #308 规范稿：页签 + 工具栏 + 描述 + 卡片列表，全部走
 * `--dsw-alias-*` 主题变量，明暗主题自适应。
 */
import { cssr } from 'dsh-tauri-ui/client'

const { c } = cssr

export default c([
  // ── 侧栏入口：官方 iconButton 复刻（插在 .dshp-settings-trigger 右侧）──
  c('.dshp-pet__icon-button', {
    appearance: 'none',
    color: 'var(--dsw-alias-label-tertiary)',
    cursor: 'pointer',
    background: '0 0',
    border: '0',
    borderRadius: '7px',
    alignItems: 'center',
    padding: '6px',
    display: 'inline-flex',
    position: 'relative',
    pointerEvents: 'auto',
  }, [
    c('&:disabled', { opacity: '0.4', cursor: 'default' }),
    c('&:hover:not(:disabled)', {
      background: 'var(--dsw-alias-bg-layer-1)',
      color: 'var(--dsw-alias-label-primary)',
    }),
    c('&:focus-visible', {
      outline: '2px solid var(--dsw-alias-brand-primary)',
      outlineOffset: '-1px',
    }),
  ]),
  // data-tip 气泡（同官方 iconButton 的 :after 提示位）。
  c('.dshp-pet__icon-button::after', {
    content: 'attr(data-tip)',
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--dsw-alias-label-primary)',
    color: 'var(--dsw-alias-bg-layer-3, #fff)',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    lineHeight: '16px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s ease',
    zIndex: '10',
  }),
  c('.dshp-pet__icon-button:hover::after, .dshp-pet__icon-button:focus-visible::after', { opacity: '1' }),
  // 未选择宠物提示：点击时短暂强制显示气泡（与 hover 共用同一 data-tip 气泡）。
  c('.dshp-pet__icon-button.dshp-pet__icon-hint::after', { opacity: '1' }),
  // 激活态绿色小圆点（右上角），未激活时隐藏。
  c('.dshp-pet__icon-dot', {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '4px',
    height: '4px',
    borderRadius: '100%',
    background: 'var(--dsw-alias-state-success-primary, #3ddc84)',
    display: 'none',
  }),
  c('.dshp-pet__icon-button.dshp-pet__icon--on .dshp-pet__icon-dot', { display: 'block' }),

  // ── 设置行布局：复刻新版 dsh 客户端 SettingsRoot 的 triggerRow（flex 行）──
  // 旧版客户端 sidebar.settings 是通栏块级触发器，图标按钮直接插会被挤到下
  // 一行；补丁给触发器宿主加 .dshp-pet__settings-row（并同步内联 display:flex 兜
  // 底），触发器占满剩余宽度、图标排右侧，行内 gap 对齐官方排布。
  c('.dshp-pet__settings-row', {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  }),
  c('.dshp-pet__settings-row > .dshp-settings-trigger:not(.dshp-settings-trigger--rail)', {
    flex: '1 1 auto',
    width: 'auto',
    minWidth: '0',
  }),
  c('.dshp-pet__settings-row > .dshp-pet__icon-button', {
    flex: 'none',
    marginRight: '2px',
  }),

])
