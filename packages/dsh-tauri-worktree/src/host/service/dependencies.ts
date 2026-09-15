/**
 * dependencies.ts — 工作树依赖目录的自动链接，以及安装前的「独立化」断开。
 *
 * 背景：`git worktree add` 只检出 tracked 文件，node_modules 等被 gitignore 的依赖
 * 目录不会跟随，新建工作树因此开箱不可用。完整安装代价高，所以默认把源仓库的依赖
 * 目录以目录联接（Windows junction / POSIX 目录符号链接）挂进工作树。
 *
 * 但链接是共享的：包管理器若直接写入会穿透链接污染源仓库 —— pnpm 会把源仓库的
 * workspace 链接改写成指向工作树，工作树删除后留下一批悬空链接（见
 * https://github.com/pnpm/pnpm/issues/14286）。因此安装类命令执行前必须先断开链接，
 * 让这次安装在**工作树内**物化成一份独立目录（用户要求：「假如安装的话应该会独立为
 * 一份新的 node_modules」）。
 *
 * 约定：
 *   - 链接目标必须是绝对路径（Windows junction 要求），故一律先 resolve。
 *   - 断开只删链接本身，绝不递归链接目标；真实目录（已独立安装）原样保留。
 *   - 所有 fs 失败都不抛出：链接是便利能力，不得阻断工作树创建/删除主流程。
 */

import { existsSync } from 'node:fs'
import { lstat, rm, symlink } from 'node:fs/promises'
import process from 'node:process'
import { resolve } from 'pathe'

/** 默认链接的依赖目录名。 */
export const DEFAULT_LINK_DIRECTORIES: readonly string[] = ['node_modules']

/**
 * 安装类命令的识别模式。只匹配「包管理器 + 安装动作」的组合，避免把
 * `pnpm run build`、`npm test` 等普通命令误判成安装。
 */
const INSTALL_PATTERNS: readonly RegExp[] = [
  // npm/pnpm/yarn/bun 及其 runner：安装/增删/更新依赖。
  /\b(?:npm|pnpm|yarn|yarnpkg|bun|corepack|pnpx|npx)\s+(?:install|i|ci|add|update|upgrade|up|remove|rm|uninstall|unlink|link|dedupe|prune|rebuild|install-test|it)\b/i,
  // 裸 `yarn`（无子命令）等价于 yarn install。
  /(?:^|[\s;&|()])yarn\s*(?:$|[\s;&|()])/i,
  // Python 生态。
  /\b(?:pip|pip3|pipenv|poetry|uv|conda|mamba)\s+(?:install|sync|add|update|upgrade|lock|remove|uninstall)\b/i,
  // Rust / Go / Ruby / PHP / .NET / JVM 生态（当用户把 target/vendor 等目录加入链接时同样适用）。
  /\bcargo\s+(?:fetch|build|install|update)\b/i,
  /\bgo\s+(?:mod\s+(?:download|tidy|vendor)|get)\b/i,
  /\b(?:bundle|bundler)\s+install\b/i,
  /\bcomposer\s+(?:install|update|require|remove)\b/i,
  /\bdotnet\s+(?:restore|add\s+package)\b/i,
  /\b(?:mvn|maven|gradle|gradlew)\b[^\n;&|]+\bdependenc(?:y|ies)\b/i,
]

/**
 * 归一化待链接目录名：去空白/尾分隔符、拒绝空值与 `.`/`..`、拒绝含路径分隔符的
 * 条目（否则会链接到工作树之外），去重且保持声明顺序。空输入回退默认值。
 */
export function normalizeLinkDirectories(directories?: readonly string[]): string[] {
  const source = directories && directories.length > 0 ? directories : DEFAULT_LINK_DIRECTORIES
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const raw of source) {
    const name = String(raw ?? '').trim().replace(/[\\/]+$/, '')
    if (!name || name === '.' || name === '..')
      continue
    if (name.includes('/') || name.includes('\\'))
      continue
    const key = process.platform === 'win32' ? name.toLowerCase() : name
    if (seen.has(key))
      continue
    seen.add(key)
    normalized.push(name)
  }
  return normalized
}

/** 命令文本是否疑似安装依赖（用于安装前断开共享链接）。 */
export function isDependencyInstallCommand(command: string): boolean {
  const text = String(command ?? '')
  if (text.length === 0)
    return false
  return INSTALL_PATTERNS.some(pattern => pattern.test(text))
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  }
  catch {
    return false
  }
}

/**
 * 把源仓库的依赖目录链接进新工作树。
 *
 * @param projectPath 源仓库顶层
 * @param worktreePath 工作树目录
 * @param directories 待链接的目录名（默认 node_modules）
 * @returns linked 为成功建立链接的目录名；skipped 为源目录缺失或目标已存在的目录名
 */
export async function linkWorktreeDependencies(
  projectPath: string,
  worktreePath: string,
  directories: readonly string[] = DEFAULT_LINK_DIRECTORIES,
): Promise<{ linked: string[], skipped: string[] }> {
  const linked: string[] = []
  const skipped: string[] = []
  for (const name of normalizeLinkDirectories(directories)) {
    // Windows junction 要求绝对目标；相对目标会创建出读不通的链接。
    const source = resolve(projectPath, name)
    const target = resolve(worktreePath, name)
    if (!existsSync(source) || await pathExists(target)) {
      skipped.push(name)
      continue
    }
    try {
      await symlink(source, target, process.platform === 'win32' ? 'junction' : 'dir')
      linked.push(name)
    }
    catch {
      // 权限/占用/跨卷失败：保持工作树可用，退化为「需要自行安装」。
      skipped.push(name)
    }
  }
  return { linked, skipped }
}

/**
 * 断开工作树内的依赖链接（安装前物化独立目录、删除工作树前保护源仓库）。
 * 只删除符号链接/junction 本身；真实目录（已独立安装）不动。
 *
 * @returns 实际被断开的目录名
 */
export async function unlinkWorktreeDependencies(
  worktreePath: string,
  directories: readonly string[] = DEFAULT_LINK_DIRECTORIES,
): Promise<string[]> {
  const unlinked: string[] = []
  for (const name of normalizeLinkDirectories(directories)) {
    const target = resolve(worktreePath, name)
    let stats
    try {
      stats = await lstat(target)
    }
    catch {
      continue
    }
    if (!stats.isSymbolicLink())
      continue
    try {
      // recursive:false 只摘链接，绝不进入链接目标；Windows junction 亦适用。
      await rm(target, { recursive: false, force: true })
      unlinked.push(name)
    }
    catch {
      /* 删除失败保留链接：由后续重试或人工处理，不阻断主流程 */
    }
  }
  return unlinked
}
