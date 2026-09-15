import { spawnSync } from 'node:child_process'
import process from 'node:process'

const targets = {
  linux: 'x86_64-unknown-linux-gnu',
  win: 'x86_64-pc-windows-msvc',
  mac: process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin',
}

const requested = process.argv[2] ?? 'all'
const extraArgs = process.argv.slice(3)
const selected = requested === 'all' ? Object.entries(targets) : [[requested, targets[requested]]]

if (selected.some(([, triple]) => triple === undefined)) {
  throw new Error(`Unknown build target ${requested}; use all, linux, win, or mac`)
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
for (const [name, triple] of selected) {
  const environment = { ...process.env, TAURI_ENV_TARGET_TRIPLE: triple }
  console.log(`Building ${name} (${triple})`)
  const result = spawnSync(pnpm, ['exec', 'tauri', 'build', '--target', triple, ...extraArgs], {
    env: environment,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
