import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = resolve(import.meta.dirname, '..')
const sourceTraySvg = resolve(root, 'assets', 'macos-tray.svg')
const targetTrayPng = resolve(root, 'src-tauri', 'icons', 'macos-tray.png')
const traySize = 64

function rasterizeTrayIcon(): void {
  const svg = readFileSync(sourceTraySvg)
  const rendered = new Resvg(svg, {
    fitTo: { mode: 'width', value: traySize },
  }).render()
  const pixels = rendered.pixels
  if (pixels.length < 4 || pixels[3] !== 0) {
    throw new Error('tray PNG corner is not transparent; refuse to write an opaque background')
  }
  writeFileSync(targetTrayPng, rendered.asPng())
  console.log(`[rebuild-macos-icon] updated ${relative(root, targetTrayPng)}`)
}

rasterizeTrayIcon()
