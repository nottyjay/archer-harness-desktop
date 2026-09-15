/**
 * components/model-picker.tsx — 模型选择器（完全照搬 dsh-automation
 * create-modal.tsx 的 ModelPicker：root/model/effort 三 pane + provider 分组）。
 *
 * 结构、交互、aria 逐字对齐 dsh-automation；仅结构性类名换成
 * SCHEDULER_CLASSES 前缀（状态修饰符 is-open/is-up/is-end/is-kv/is-on 保留）。
 */

import type { ModelCatalogFailure, ModelOption, ModelTranslate } from '../types'
import { IconCheckOutline16 as Check, IconChevronDownOutline14 as ChevronDown } from '@deepseek-ai/dsh-client-ui-primitives'
import { Icon, useMountStyle } from 'dsh-tauri-ui/client'
import { useEffect, useState } from 'react'
import { MODEL_PICKER_STYLE_ID } from '../constants'
import { MenuPopup, MenuRow, useMenuState } from './menu'
import modelPickerStyle from './model-picker.cssr'

export function ModelPicker({
  modelT,
  models,
  failures,
  modelKey,
  reasoningEffort,
  onSelection,
}: {
  readonly modelT: ModelTranslate
  readonly models: readonly ModelOption[]
  readonly failures: readonly ModelCatalogFailure[]
  readonly modelKey: string
  readonly reasoningEffort: string
  readonly onSelection: (modelKey: string, reasoningEffort: string) => void
}) {
  useMountStyle(modelPickerStyle, MODEL_PICKER_STYLE_ID)
  const menu = useMenuState()
  const [pane, setPane] = useState<'root' | 'model' | 'effort'>('root')
  const selected = models.find(item => `${item.provider}::${item.model}` === modelKey)
  const reasoning = selected?.reasoning
  const effectiveEffort = reasoningEffort === 'none'
    ? reasoning?.defaultEffort
    : reasoningEffort
  const effortLabel = reasoning === undefined
    ? undefined
    : effectiveEffort === undefined
      ? modelT('effort.providerDefault')
      : reasoning.efforts.find(item => item.id === effectiveEffort)?.name ?? effectiveEffort
  const trigger = selected?.label ?? modelT('trigger.fallback')
  const modelGroups = Array.from(models.reduce((groups, item) => {
    const group = groups.get(item.provider) ?? { label: item.providerLabel, models: [] }
    group.models.push(item)
    groups.set(item.provider, group)
    return groups
  }, new Map<string, { label: string, models: ModelOption[] }>()))

  useEffect(() => {
    if (!menu.open)
      return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape')
        return
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      if (pane !== 'root')
        setPane('root')
      else menu.setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
  }, [menu.open, menu.setOpen, pane])

  const selectModel = (item: ModelOption): void => {
    onSelection(
      `${item.provider}::${item.model}`,
      item.reasoning?.defaultEffort ?? 'none',
    )
    menu.setOpen(false)
    setPane('root')
  }

  const selectEffort = (effort: string): void => {
    onSelection(modelKey, effort)
    menu.setOpen(false)
    setPane('root')
  }

  return (
    <div className={`${'dshp-scheduler__model-select'}${menu.open ? ` ${'dshp-scheduler__model-select--open'}` : ''}`} ref={menu.root}>
      <button
        type="button"
        className="dshp-scheduler__model-trigger"
        aria-label={selected === undefined
          ? modelT('trigger.selectAria')
          : effortLabel === undefined
            ? modelT('trigger.aria', { model: selected.label })
            : modelT('trigger.ariaEffort', { model: selected.label, effort: effortLabel })}
        onMouseDown={event => event.stopPropagation()}
        onClick={() => {
          if (menu.open) {
            menu.setOpen(false)
            return
          }
          setPane('root')
          menu.setOpen(true)
        }}
      >
        <span>{trigger}</span>
        {effortLabel !== undefined && <span className="dshp-scheduler__model-trigger-effort">{effortLabel}</span>}
        <Icon as={ChevronDown} className={`${'dshp-scheduler__model-trigger-chevron'}${menu.open ? ` ${'dshp-scheduler__model-trigger-chevron--open'}` : ''}`} />
      </button>
      <MenuPopup open={menu.open} anchor={menu.root} menuRef={menu.menu} up end className={`${'dshp-scheduler__model-select-menu'} is-up is-end`} ariaLabel={modelT('menu.aria')}>
        {pane === 'root' && (
          <>
            <MenuRow
              kv
              label={modelT('menu.model')}
              hint={selected?.label ?? modelT('trigger.fallback')}
              chevron
              onClick={() => setPane('model')}
            />
            {reasoning !== undefined && (
              <MenuRow
                kv
                label={modelT('menu.effort')}
                hint={effortLabel ?? modelT('effort.providerDefault')}
                chevron
                onClick={() => setPane('effort')}
              />
            )}
          </>
        )}
        {pane === 'model' && (
          <>
            {failures.map(failure => (
              <div key={failure.provider} className="dshp-scheduler__model-warning">
                {modelT('warning.groupLoad', { name: failure.providerLabel, message: failure.message })}
              </div>
            ))}
            {modelGroups.map(([provider, group]) => (
              <section key={provider} role="group" aria-label={group.label} className="dshp-scheduler__model-group">
                <div className="dshp-scheduler__model-group-title">{group.label}</div>
                {group.models.map((item) => {
                  const value = `${item.provider}::${item.model}`
                  return (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={value === modelKey}
                      className="dshp-scheduler__model-option"
                      title={item.label}
                      onClick={() => selectModel(item)}
                    >
                      <span className="dshp-scheduler__model-option-copy">
                        <span className="dshp-scheduler__model-name">{item.label}</span>
                        {item.description !== undefined && <span className="dshp-scheduler__model-description">{item.description}</span>}
                      </span>
                      <span className="dshp-scheduler__model-check">{value === modelKey && <Icon as={Check} />}</span>
                    </button>
                  )
                })}
              </section>
            ))}
            {modelGroups.length === 0 && failures.length === 0 && <div className="dshp-scheduler__model-empty">{modelT('empty.models')}</div>}
          </>
        )}
        {pane === 'effort' && reasoning !== undefined && (
          <>
            {reasoning.defaultEffort === undefined && (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={reasoningEffort === 'none'}
                className="dshp-scheduler__model-option"
                onClick={() => selectEffort('none')}
              >
                <span className="dshp-scheduler__model-option-copy"><span className="dshp-scheduler__model-name">{modelT('effort.providerDefault')}</span></span>
                <span className="dshp-scheduler__model-check">{reasoningEffort === 'none' && <Icon as={Check} />}</span>
              </button>
            )}
            {reasoning.efforts.map(item => (
              <button
                key={item.id}
                type="button"
                role="menuitemradio"
                aria-checked={effectiveEffort === item.id}
                className="dshp-scheduler__model-option"
                onClick={() => selectEffort(item.id)}
              >
                <span className="dshp-scheduler__model-option-copy">
                  <span className="dshp-scheduler__model-name">{item.name}</span>
                  {item.description !== undefined && <span className="dshp-scheduler__model-description">{item.description}</span>}
                </span>
                <span className="dshp-scheduler__model-check">{effectiveEffort === item.id && <Icon as={Check} />}</span>
              </button>
            ))}
            {reasoning.efforts.length === 0 && reasoning.defaultEffort !== undefined && <div className="dshp-scheduler__model-empty">{modelT('empty.efforts')}</div>}
          </>
        )}
      </MenuPopup>
    </div>
  )
}
