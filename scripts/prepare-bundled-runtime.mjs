import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { delimiter, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'

const NODE_VERSION = 'v22.22.0'
const projectRoot = resolve(import.meta.dirname, '..')
const bundledRoot = join(projectRoot, 'src-tauri', 'resources', 'bundled')
const cacheRoot = join(projectRoot, '.tmp', 'bundled-runtime')
const harnessRoot = join(projectRoot, 'vendor', 'deepseek-harness')
const harnessWorkRoot = join(cacheRoot, 'harness-src')
const dshPatchRoot = join(projectRoot, 'patches', 'dsh')
const harnessCommit = readFileSync(join(harnessRoot, '.source-commit'), 'utf8').trim()
const harnessVersion = JSON.parse(readFileSync(join(harnessRoot, 'package.json'), 'utf8')).version
const skippedHarnessDirectoryNames = new Set([
  '.artifacts',
  '.cache',
  '.dsh-build',
  '.git',
  '.pnpm-store',
  '.sessions',
  '.storages',
  'coverage',
  'dist',
  'lib',
  'node_modules',
])

function targetFromTriple(triple) {
  const os = triple?.includes('windows')
    ? 'windows'
    : triple?.includes('darwin')
      ? 'darwin'
      : triple?.includes('linux')
        ? 'linux'
        : process.platform
  const arch = triple?.includes('aarch64') || triple?.includes('arm64') || (!triple && process.arch === 'arm64')
    ? 'aarch64'
    : 'x86_64'
  return `${os}-${arch}`
}

function nodeRelease(target) {
  const [os, arch] = target.split('-')
  const platform = os === 'windows' ? 'win' : os
  const nodeArch = arch === 'aarch64' ? 'arm64' : 'x64'
  const extension = platform === 'win' ? 'zip' : 'tar.gz'
  const folder = `node-${NODE_VERSION}-${platform}-${nodeArch}`
  return { folder, archive: `${folder}.${extension}` }
}

function nodeBinary(root, target) {
  return target.startsWith('windows-') ? join(root, 'node.exe') : join(root, 'bin', 'node')
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`)
  }
}

async function download(url, destination) {
  const temporary = `${destination}.tmp`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  await writeFile(temporary, new Uint8Array(await response.arrayBuffer()))
  await rename(temporary, destination)
}

async function prepareNode(target) {
  const { folder, archive: archiveName } = nodeRelease(target)
  const downloads = join(cacheRoot, 'downloads')
  const archive = join(downloads, archiveName)
  const sums = join(downloads, `node-${NODE_VERSION}-SHASUMS256.txt`)
  const releaseUrl = `https://nodejs.org/dist/${NODE_VERSION}`
  await mkdir(downloads, { recursive: true })

  if (!existsSync(sums)) await download(`${releaseUrl}/SHASUMS256.txt`, sums)
  const checksumLine = (await readFile(sums, 'utf8'))
    .split(/\r?\n/u)
    .find(line => line.endsWith(`  ${archiveName}`))
  if (!checksumLine) throw new Error(`${archiveName} is absent from the Node.js checksum manifest`)
  const expectedChecksum = checksumLine.trim().split(/\s+/u)[0]

  if (!existsSync(archive)) await download(`${releaseUrl}/${archiveName}`, archive)
  let actualChecksum = createHash('sha256').update(await readFile(archive)).digest('hex')
  if (actualChecksum !== expectedChecksum) {
    await rm(archive, { force: true })
    await download(`${releaseUrl}/${archiveName}`, archive)
    actualChecksum = createHash('sha256').update(await readFile(archive)).digest('hex')
  }
  if (actualChecksum !== expectedChecksum) throw new Error(`Checksum mismatch for ${archiveName}`)

  const extraction = join(cacheRoot, 'node', target)
  const distribution = join(extraction, folder)
  if (!existsSync(nodeBinary(distribution, target))) {
    await rm(extraction, { recursive: true, force: true })
    await mkdir(extraction, { recursive: true })
    run('tar', ['-xf', archive, '-C', extraction])
  }
  if (!existsSync(nodeBinary(distribution, target))) {
    throw new Error(`Extracted Node.js runtime has no executable: ${distribution}`)
  }
  return distribution
}

function hostTarget() {
  const os = process.platform === 'win32' ? 'windows' : process.platform
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
  return `${os}-${arch}`
}

function harnessPnpmSpec(manifestRoot) {
  const spec = JSON.parse(readFileSync(join(manifestRoot, 'package.json'), 'utf8')).packageManager
  if (typeof spec !== 'string' || !spec.startsWith('pnpm@')) {
    throw new Error(`Harness package.json packageManager must pin a pnpm version (got ${JSON.stringify(spec)})`)
  }
  return spec
}

function corepackEnv(corepackHome) {
  return {
    COREPACK_HOME: corepackHome,
    COREPACK_ENABLE_AUTO_PIN: '0',
    COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
  }
}

/**
 * 内置 Node 发行版自带的 corepack。Harness 根节点钉死 `packageManager`（当前是 pnpm@11.7.0），
 * 桌面仓库则是 pnpm@10.28.2。打包必须走这份 corepack，禁止回退到系统 / 桌面 pnpm，也禁止
 * `--config.manage-package-manager-versions=false`：那会把版本针关掉，正是 Windows 上
 * ERR_PNPM_BAD_PM_VERSION 的反面。
 */
function corepackPackage(nodeRoot) {
  const directory = process.platform === 'win32'
    ? join(nodeRoot, 'node_modules', 'corepack')
    : join(nodeRoot, 'lib', 'node_modules', 'corepack')
  const entry = join(directory, 'dist', 'corepack.js')
  const shims = join(directory, 'shims')
  const shimName = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  if (!existsSync(entry)) {
    throw new Error(
      `Bundled Node.js ${NODE_VERSION} is missing corepack (${entry}). Harness pins ${harnessPnpmSpec(harnessRoot)} and cannot use the desktop repo's pnpm.`,
    )
  }
  if (!existsSync(join(shims, shimName))) {
    throw new Error(`Bundled corepack is missing the ${shimName} shim in ${shims}`)
  }
  return { directory, entry, shims }
}

function activatePinnedPnpm(node, nodeRoot, spec) {
  const corepack = corepackPackage(nodeRoot)
  const corepackHome = join(cacheRoot, 'corepack')
  const path = [dirname(node), process.env.PATH]
    .filter(entry => entry !== undefined && entry !== '')
    .join(delimiter)
  run(node, [corepack.entry, 'prepare', spec, '--activate'], {
    env: {
      ...process.env,
      ...corepackEnv(corepackHome),
      PATH: path,
    },
  })
  return { ...corepack, corepackHome, spec }
}

function runPnpm(node, pnpm, args, cwd) {
  // Harness 脚本（`build:web` 等）还会再 spawn 一次 `pnpm`，那一层只看 PATH。corepack shim
  // 必须排在系统 pnpm 前面，嵌套调用才会落到已 activate 的 pnpm@<pin>；否则 Windows 上只要
  // 开发机全局 pnpm 比锁定值新，就会 ERR_PNPM_BAD_PM_VERSION。
  const path = [pnpm.shims, dirname(node), process.env.PATH]
    .filter(entry => entry !== undefined && entry !== '')
    .join(delimiter)
  run(node, [pnpm.entry, pnpm.spec, ...args], {
    cwd,
    env: {
      ...process.env,
      ...corepackEnv(pnpm.corepackHome),
      CI: 'true',
      DSH_BUILD_CLIENT_PROFILE: 'official',
      DSH_CLIENT_BUILD_PROFILE: 'official',
      DSH_CLIENT_COMMIT_HASH: harnessCommit,
      DSH_CLIENT_TITLE: 'DeepSeek Harness',
      DSH_CLIENT_VERSION: harnessVersion,
      GIT_CEILING_DIRECTORIES: projectRoot,
      NODE: node,
      npm_node_execpath: node,
      PATH: path,
    },
  })
}

async function dshPatchFiles() {
  if (!existsSync(dshPatchRoot)) return []
  return (await readdir(dshPatchRoot))
    .filter(name => name.endsWith('.patch'))
    .sort()
    .map(name => join(dshPatchRoot, name))
}

async function dshPatchStamp(patches) {
  const hash = createHash('sha256')
  hash.update(harnessCommit)
  for (const patch of patches) {
    hash.update(relative(projectRoot, patch))
    hash.update(await readFile(patch))
  }
  return hash.digest('hex')
}

function applyDshPatches(workRoot, patches) {
  for (const patch of patches) {
    const check = spawnSync('git', ['apply', '--check', '--whitespace=nowarn', patch], {
      cwd: workRoot,
      encoding: 'utf8',
    })
    if (check.error) {
      if (check.error.code === 'ENOENT') {
        throw new Error('git is required to apply patches/dsh onto the Harness staging copy')
      }
      throw check.error
    }
    if (check.status !== 0) {
      const name = relative(projectRoot, patch)
      const detail = `${check.stderr ?? ''}${check.stdout ?? ''}`.trim()
      throw new Error(
        `DSH patch ${name} does not apply to vendor/deepseek-harness@${harnessCommit}. Rebase the patch after upgrading DSH.${detail ? `\n${detail}` : ''}`,
      )
    }
    run('git', ['apply', '--whitespace=nowarn', patch], { cwd: workRoot })
  }
}

function shouldCopyHarnessPath(src) {
  const rel = relative(harnessRoot, src)
  if (rel === '') return true
  const parts = rel.split(sep)
  if (parts.some(part => skippedHarnessDirectoryNames.has(part))) return false
  const base = parts.at(-1)
  return base !== '.dsh-patch-stamp' && !base.endsWith('.tsbuildinfo')
}

async function materializePatchedHarness() {
  const patches = await dshPatchFiles()
  const stamp = await dshPatchStamp(patches)
  const stampPath = join(harnessWorkRoot, '.dsh-patch-stamp')
  if (existsSync(stampPath) && (await readFile(stampPath, 'utf8')).trim() === stamp) {
    return harnessWorkRoot
  }

  await rm(harnessWorkRoot, { recursive: true, force: true })
  await cp(harnessRoot, harnessWorkRoot, { recursive: true, filter: shouldCopyHarnessPath })
  applyDshPatches(harnessWorkRoot, patches)
  await writeFile(stampPath, `${stamp}\n`)
  return harnessWorkRoot
}

function isInside(parent, child) {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

async function materializeExternalLinks(root, directory = root) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await materializeExternalLinks(root, path)
      continue
    }
    if (!entry.isSymbolicLink()) continue

    const target = await realpath(path)
    if (isInside(root, target)) continue

    const temporary = `${path}.materialized`
    await rm(temporary, { recursive: true, force: true })
    await cp(target, temporary, { recursive: true, dereference: true })
    await rm(path, { force: true })
    await rename(temporary, path)
  }
}

async function installHarnessCli(destination, sourceRoot) {
  const source = join(sourceRoot, 'apps', 'cli')
  const target = join(destination, 'node_modules', '@deepseek-ai', 'dsh')
  const targetLib = join(target, 'lib')
  if (existsSync(join(targetLib, 'bin.js'))) return
  await mkdir(targetLib, { recursive: true })
  await cp(join(source, 'package.json'), join(target, 'package.json'))
  for (const entry of await readdir(join(source, 'lib'), { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) {
      await cp(join(source, 'lib', entry.name), join(targetLib, entry.name))
    }
  }
}

async function validateBundledWorkspacePeers(destination) {
  const nodeModules = join(destination, 'node_modules')
  const scope = join(nodeModules, '@deepseek-ai')
  const missing = new Map()

  for (const entry of await readdir(scope, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifestPath = join(scope, entry.name, 'package.json')
    if (!existsSync(manifestPath)) continue
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    for (const dependency of Object.keys(manifest.peerDependencies ?? {})) {
      if (!dependency.startsWith('@deepseek-ai/')) continue
      const dependencyPath = join(nodeModules, ...dependency.split('/'))
      if (existsSync(dependencyPath)) continue
      const dependents = missing.get(dependency) ?? []
      dependents.push(manifest.name ?? entry.name)
      missing.set(dependency, dependents)
    }
  }

  if (missing.size === 0) return
  const details = [...missing]
    .map(([dependency, dependents]) => `${dependency} (required by ${dependents.join(', ')})`)
    .join('; ')
  throw new Error(`Bundled Harness workspace peers are missing: ${details}`)
}

async function prepareHarness(destination, target, override) {
  if (override) {
    await cp(resolve(override), destination, { recursive: true })
  } else {
    const currentHost = hostTarget()
    if (target !== currentHost) {
      throw new Error(
        `Building the bundled Harness for ${target} requires a matching build host or DSH_BUNDLED_DIR_${target.toUpperCase().replaceAll('-', '_')}`,
      )
    }
    if (!existsSync(join(harnessRoot, 'apps', 'cli', 'package.json'))) {
      throw new Error(`Bundled Harness source is missing: ${harnessRoot}`)
    }
    const workRoot = await materializePatchedHarness()
    const hostNodeRoot = await prepareNode(currentHost)
    const hostNode = nodeBinary(hostNodeRoot, currentHost)
    const pnpm = activatePinnedPnpm(hostNode, hostNodeRoot, harnessPnpmSpec(workRoot))
    runPnpm(hostNode, pnpm, ['install', '--frozen-lockfile'], workRoot)
    runPnpm(hostNode, pnpm, ['run', 'build:native-system'], workRoot)
    runPnpm(hostNode, pnpm, ['run', 'build:lib:host'], workRoot)
    // Client 半场的 tsc 工程（`tsconfig.client.json`）不在 `build:lib:host` 里：host 工程显式
    // 排除了 `packages/client/*/src/**`，`lib/types/**`（Node 半场入口）与 `lib/types/client/**`
    // 只由这一步产出。缺了它，下面的 client tsdown 会以
    // `[UNRESOLVED_ENTRY] Cannot resolve entry module lib/types/index.js` 失败；并且并发调度的
    // 先后不同，报错落在哪个包会漂移，看起来像偶发失败。只有先前跑过整套 Harness 构建（`lib/`
    // 与其中的 `tsbuildinfo` 都在 .gitignore 内）的机器才碰巧带着这些产物，因此在 mac 上「正常」。
    // `--noCheck`：这一步只要产物，不要类型结论。Client 聚合里的 `packages/client/*/tests/**`
    // 存在既有的 React 类型不匹配（19 的 `ReactNode` 交给 18 的类型），带检查会以非零码中断打包；
    // 上游 `build:lib:client` 在当前依赖解析下同样过不去，所以产物步骤跳过类型检查。
    runPnpm(hostNode, pnpm, ['exec', 'tsc', '-b', 'tsconfig.client.json', '--noCheck'], workRoot)
    runPnpm(hostNode, pnpm, ['exec', 'tsdown', '--env.DSH_BUILD_FACE', 'client'], workRoot)
    runPnpm(hostNode, pnpm, ['run', 'build:web'], workRoot)
    runPnpm(hostNode, pnpm, [
      '--filter',
      'dsh-python-runtime-closure',
      'deploy',
      '--legacy',
      '--prod',
      '--config.node-linker=hoisted',
      '--config.auto-install-peers=true',
      '--config.link-workspace-packages=true',
      destination,
    ], workRoot)
    await materializeExternalLinks(destination)
    await installHarnessCli(destination, workRoot)
    await validateBundledWorkspacePeers(destination)
  }

  const entry = join(destination, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  if (!existsSync(entry)) throw new Error(`Compiled Harness entry is missing: ${entry}`)
  if (target === hostTarget()) {
    const nodeRoot = await prepareNode(target)
    run(nodeBinary(nodeRoot, target), [entry, '--version'], { cwd: destination })
  }
}

async function main() {
  const target = targetFromTriple(process.env.TAURI_ENV_TARGET_TRIPLE)
  const envSuffix = target.toUpperCase().replaceAll('-', '_')
  const dshOverride = process.env[`DSH_BUNDLED_DIR_${envSuffix}`] ?? process.env.DSH_BUNDLED_DIR
  const nodeOverride = process.env[`NODE_BUNDLED_DIR_${envSuffix}`] ?? process.env.NODE_BUNDLED_DIR
  const staging = join(cacheRoot, 'staging', target)
  const stagingNode = join(staging, 'node')
  const stagingDsh = join(staging, 'dsh')

  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })

  if (nodeOverride) await cp(resolve(nodeOverride), stagingNode, { recursive: true })
  else await cp(await prepareNode(target), stagingNode, { recursive: true })
  if (!existsSync(nodeBinary(stagingNode, target))) {
    throw new Error(`Bundled Node.js executable is missing: ${nodeBinary(stagingNode, target)}`)
  }
  await prepareHarness(stagingDsh, target, dshOverride)

  await mkdir(bundledRoot, { recursive: true })
  for (const entry of await readdir(bundledRoot, { withFileTypes: true })) {
    if (entry.name !== 'README.md') await rm(join(bundledRoot, entry.name), { recursive: true, force: true })
  }
  await rename(staging, join(bundledRoot, target))
  console.log(`Prepared bundled Node.js ${NODE_VERSION} and Harness runtime for ${target}`)
}

await main()
