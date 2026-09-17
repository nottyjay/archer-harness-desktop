import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('plugin panel local load', () => {
  it('wires folder pick and link install through Tauri commands', () => {
    const source = readFileSync(new URL('../src/ui/config/plugin.tsx', import.meta.url), 'utf8')
    expect(source).toContain(`invoke<string | null>('pick_local_plugin_directory')`)
    expect(source).toContain(`invoke<{ name: string, version: string }>('install_local_plugin'`)
    expect(source).toContain('plugins.load_local')
    expect(source).toContain('store.harness.restart()')
  })

  it('exposes a debug-page button that opens webview devtools', () => {
    const source = readFileSync(new URL('../src/ui/config/debug.tsx', import.meta.url), 'utf8')
    expect(source).toContain(`invoke('open_webview_devtools')`)
    expect(source).toContain('ui.open_devtools')
    expect(source).toContain('ui.logs_debug_hint')
  })
})
