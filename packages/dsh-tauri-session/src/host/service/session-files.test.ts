import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { locateSessionDataDir, removeSessionDataDir } from './session-files'

let dshHome = ''

beforeEach(() => {
  dshHome = mkdtempSync(join(tmpdir(), 'dsh-session-files-'))
})

afterEach(() => {
  rmSync(dshHome, { recursive: true, force: true })
})

function makeSessionDir(group: string | undefined, marker: string): string {
  const dir = group ? join(dshHome, 'sessions', group, marker) : join(dshHome, 'sessions', marker)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('locateSessionDataDir', () => {
  it('finds a depth-2 session data directory (sessions/<group>/session-<id>)', () => {
    const dir = makeSessionDir('--project-a--', 'session-abc')
    expect(locateSessionDataDir('abc', dshHome)).toBe(dir)
  })

  it('finds a depth-1 session data directory (sessions/session-<id>)', () => {
    const dir = makeSessionDir(undefined, 'session-xyz')
    expect(locateSessionDataDir('xyz', dshHome)).toBe(dir)
  })

  it('returns undefined when no session data directory exists', () => {
    expect(locateSessionDataDir('missing', dshHome)).toBeUndefined()
  })
})

describe('removeSessionDataDir', () => {
  it('removes the located depth-2 directory', () => {
    makeSessionDir('--project-a--', 'session-abc')
    expect(removeSessionDataDir('abc', dshHome)).toBe(true)
    expect(locateSessionDataDir('abc', dshHome)).toBeUndefined()
  })

  it('prunes an empty parent group directory after removal', () => {
    makeSessionDir('--project-a--', 'session-abc')
    expect(removeSessionDataDir('abc', dshHome)).toBe(true)
    expect(locateSessionDataDir('abc', dshHome)).toBeUndefined()
    expect(existsSync(join(dshHome, 'sessions', '--project-a--'))).toBe(false)
  })

  it('keeps a parent group directory that still holds other sessions', () => {
    makeSessionDir('--project-a--', 'session-abc')
    makeSessionDir('--project-a--', 'session-def')
    expect(removeSessionDataDir('abc', dshHome)).toBe(true)
    expect(existsSync(join(dshHome, 'sessions', '--project-a--'))).toBe(true)
    expect(locateSessionDataDir('def', dshHome)).toBe(join(dshHome, 'sessions', '--project-a--', 'session-def'))
  })

  it('keeps the sessions root itself when a depth-1 directory is removed', () => {
    const dir = makeSessionDir(undefined, 'session-xyz')
    expect(removeSessionDataDir('xyz', dshHome)).toBe(true)
    expect(existsSync(dir)).toBe(false)
    expect(existsSync(join(dshHome, 'sessions'))).toBe(true)
  })

  it('reports false when the session has no data directory', () => {
    expect(removeSessionDataDir('ghost', dshHome)).toBe(false)
  })
})
