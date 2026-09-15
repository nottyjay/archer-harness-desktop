import { copyFileSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourceIcns = join(root, 'assets', 'harness-icon.icns')
const sourceTrayPng = join(root, 'assets', 'harness-tray.png')
const targetIcns = join(root, 'src-tauri', 'icons', 'icon.icns')
const targetTrayPng = join(root, 'src-tauri', 'icons', 'macos-tray.png')

function copyAsset(source: string, target: string) {
  if (!existsSync(source)) throw new Error(`Harness icon asset is missing: ${source}`)
  copyFileSync(source, target)
  console.log(`[rebuild-macos-icon] updated ${relative(root, target)}`)
}

copyAsset(sourceIcns, targetIcns)
copyAsset(sourceTrayPng, targetTrayPng)
