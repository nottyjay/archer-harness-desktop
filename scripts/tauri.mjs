import { spawnSync } from 'node:child_process'
import process from 'node:process'

const args = process.argv.slice(2)
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const buildTargets = {
  build: 'all',
  'build:all': 'all',
  'build:linux': 'linux',
  'build:win': 'win',
  'build:mac': 'mac',
}

if (args[0] in buildTargets && !args.includes('--target')) {
  const result = spawnSync(process.execPath, ['scripts/build-tauri.mjs', buildTargets[args[0]], ...args.slice(1)], {
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

const result = spawnSync(pnpm, ['exec', 'tauri', ...args], { stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
