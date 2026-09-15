import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'

const NODE_VERSION = 'v22.22.0'
const projectRoot = resolve(import.meta.dirname, '..')
const bundledRoot = join(projectRoot, 'src-tauri', 'resources', 'bundled')
const cacheRoot = join(projectRoot, '.tmp', 'bundled-runtime')
const harnessRoot = join(projectRoot, 'vendor', 'deepseek-harness')
const harnessCommit = readFileSync(join(harnessRoot, '.source-commit'), 'utf8').trim()
const harnessVersion = JSON.parse(readFileSync(join(harnessRoot, 'package.json'), 'utf8')).version

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

/**
 * 内置 Node 发行版自带的 corepack 包目录：`pnpmInvocation` 用它找 corepack 入口，
 * `runPnpm` 用它把 shim 目录放进子进程 PATH。发行版未附带 corepack 时返回 undefined。
 */
function corepackPackageDir(nodeRoot) {
  const directory = process.platform === 'win32'
    ? join(nodeRoot, 'node_modules', 'corepack')
    : join(nodeRoot, 'lib', 'node_modules', 'corepack')
  return existsSync(directory) ? directory : undefined
}

function pnpmInvocation(node, nodeRoot, args) {
  const corepackDirectory = corepackPackageDir(nodeRoot)
  const corepack = corepackDirectory === undefined
    ? undefined
    : join(corepackDirectory, 'dist', 'corepack.js')
  if (corepack !== undefined && existsSync(corepack)) {
    return [node, [corepack, 'pnpm', ...args]]
  }

  const entrypoint = process.env.npm_execpath
  if (entrypoint && ['.js', '.cjs', '.mjs'].includes(extname(entrypoint).toLowerCase())) {
    return [node, [entrypoint, '--config.manage-package-manager-versions=false', ...args]]
  }
  return [process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args]
}

function runPnpm(node, nodeRoot, args) {
  const [command, commandArgs] = pnpmInvocation(node, nodeRoot, args)
  // Harness 自己的脚本（`build:web` 等）还会再调一次 `pnpm`，而那一层只看 PATH。把内置 Node 的
  // corepack shim 目录排在 PATH 最前，嵌套调用才会按项目 `packageManager`（Harness 根节点的
  // `pnpm@11.7.0`）解析版本；否则它落到开发机全局 pnpm 上，只要那个版本比锁定值新，pnpm 的
  // `packageManager` 校验就会以 ERR_PNPM_BAD_PM_VERSION 直接中断打包。
  const corepackDirectory = corepackPackageDir(nodeRoot)
  const shims = corepackDirectory === undefined ? undefined : join(corepackDirectory, 'shims')
  const path = [shims, dirname(node), process.env.PATH]
    .filter(entry => entry !== undefined && entry !== '')
    .join(delimiter)
  run(command, commandArgs, {
    cwd: harnessRoot,
    env: {
      ...process.env,
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

async function installHarnessCli(destination) {
  const source = join(harnessRoot, 'apps', 'cli')
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
    const hostNodeRoot = await prepareNode(currentHost)
    const hostNode = nodeBinary(hostNodeRoot, currentHost)
    runPnpm(hostNode, hostNodeRoot, ['install', '--frozen-lockfile'])
    runPnpm(hostNode, hostNodeRoot, ['run', 'build:native-system'])
    runPnpm(hostNode, hostNodeRoot, ['run', 'build:lib:host'])
    // Client 半场的 tsc 工程（`tsconfig.client.json`）不在 `build:lib:host` 里：host 工程显式
    // 排除了 `packages/client/*/src/**`，`lib/types/**`（Node 半场入口）与 `lib/types/client/**`
    // 只由这一步产出。缺了它，下面的 client tsdown 会以
    // `[UNRESOLVED_ENTRY] Cannot resolve entry module lib/types/index.js` 失败；并且并发调度的
    // 先后不同，报错落在哪个包会漂移，看起来像偶发失败。只有先前跑过整套 Harness 构建（`lib/`
    // 与其中的 `tsbuildinfo` 都在 .gitignore 内）的机器才碰巧带着这些产物，因此在 mac 上「正常」。
    // `--noCheck`：这一步只要产物，不要类型结论。Client 聚合里的 `packages/client/*/tests/**`
    // 存在既有的 React 类型不匹配（19 的 `ReactNode` 交给 18 的类型），带检查会以非零码中断打包；
    // 上游 `build:lib:client` 在当前依赖解析下同样过不去，所以产物步骤跳过类型检查。
    runPnpm(hostNode, hostNodeRoot, ['exec', 'tsc', '-b', 'tsconfig.client.json', '--noCheck'])
    runPnpm(hostNode, hostNodeRoot, ['exec', 'tsdown', '--env.DSH_BUILD_FACE', 'client'])
    runPnpm(hostNode, hostNodeRoot, ['run', 'build:web'])
    runPnpm(hostNode, hostNodeRoot, [
      '--filter',
      'dsh-python-runtime-closure',
      'deploy',
      '--legacy',
      '--prod',
      '--config.node-linker=hoisted',
      '--config.auto-install-peers=true',
      '--config.link-workspace-packages=true',
      destination,
    ])
    await materializeExternalLinks(destination)
    await installHarnessCli(destination)
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
