/**
 * routes/mcp.ts — MCP 服务器行 HTTP 路由（mcp 列表/保存/开关/移除 + 导入扫描/应用）。
 *
 * 只做参数化与转发：cordis.patch.yml 的读写在 ../service/mcp.ts，跨目录导入扫描在
 * ../service/agents.ts。所有返回 `restartNeeded: true`，因为行变更需要 dsh 重启才能组合。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { McpInput, McpScope } from '../service/mcp.ts'
import type { RouteRegistrar } from '../types/index.ts'
import { readJsonBody, sameOrigin, sendJson } from 'dsh-tauri'
import { API_PREFIX } from '../../shared/constants.ts'
import { scanAllMcp } from '../service/agents.ts'
import { checkMcpRow, listMcp, listMcpScoped, mcpRowToInput, mcpScopeDir, removeMcp, setMcpDisabled, upsertMcp, validateMcpInput } from '../service/mcp.ts'

/** MCP route module 的配置片：profile patch 目录。 */
export interface McpRoutesConfig {
  profileDirPath: string
  dshHomePath: string
}

export function registerMcpRoutes(
  register: RouteRegistrar,
  config: McpRoutesConfig,
): Array<() => void> {
  const disposers: Array<() => void> = []
  const readScope = (value: unknown): McpScope => value === 'global' ? 'global' : 'profile'
  const scopeDir = (value: unknown): string => mcpScopeDir(readScope(value), config.profileDirPath, config.dshHomePath)

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      const listing = listMcpScoped(config.profileDirPath, config.dshHomePath)
      sendJson(response, 200, { ...listing, restartNeeded: true })
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp/save`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const input = (await readJsonBody(request)) as McpInput & { scope?: unknown }
        const invalid = validateMcpInput(input)
        if (invalid !== null) {
          sendJson(response, 400, { error: invalid })
          return
        }
        const id = upsertMcp(scopeDir(input.scope), input)
        sendJson(response, 200, { ok: true, id, restartNeeded: true })
      }
      catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp/toggle`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const body = (await readJsonBody(request)) as { id?: unknown, disabled?: unknown, scope?: unknown }
        if (typeof body.id !== 'string' || typeof body.disabled !== 'boolean') {
          sendJson(response, 400, { error: 'id and disabled are required' })
          return
        }
        const ok = setMcpDisabled(scopeDir(body.scope), body.id, body.disabled)
        sendJson(response, ok ? 200 : 404, ok ? { ok: true, restartNeeded: true } : { error: 'server row not found' })
      }
      catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp/remove`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const body = (await readJsonBody(request)) as { id?: unknown, scope?: unknown }
        if (typeof body.id !== 'string') {
          sendJson(response, 400, { error: 'id is required' })
          return
        }
        const ok = removeMcp(scopeDir(body.scope), body.id)
        sendJson(response, ok ? 200 : 404, ok ? { ok: true, restartNeeded: true } : { error: 'server row not found' })
      }
      catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/import/scan`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'GET') {
        response.writeHead(405, { allow: 'GET' })
        response.end()
        return
      }
      try {
        sendJson(response, 200, {
          servers: scanAllMcp(),
          // Profile serverNames, so the browser can grey out existing ones.
          existing: listMcpScoped(config.profileDirPath, config.dshHomePath).servers.map(row => row.serverName),
        })
      }
      catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/import/apply`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const body = (await readJsonBody(request)) as { items?: unknown, scope?: unknown }
        const wanted = new Set(
          (Array.isArray(body.items) ? body.items : [])
            .filter((item): item is { agent: string, name: string } =>
              typeof item === 'object' && item !== null && typeof (item as { agent?: unknown }).agent === 'string' && typeof (item as { name?: unknown }).name === 'string')
            .map(item => `${item.agent}/${item.name}`),
        )
        const results: Array<{ name: string, ok: boolean, error?: string }> = []
        for (const server of scanAllMcp()) {
          if (!wanted.has(`${server.agent}/${server.name}`))
            continue
          const existing = listMcpScoped(config.profileDirPath, config.dshHomePath).servers.some(row => row.serverName === server.name)
          if (existing) {
            results.push({ name: server.name, ok: false, error: 'already in profile' })
            continue
          }
          const input: McpInput = {
            id: '',
            serverName: server.name,
            transport: server.transport,
            ...(server.transport === 'stdio'
              ? { command: server.command, args: server.args, env: server.env }
              : { url: server.url, headers: server.headers }),
          }
          const invalid = validateMcpInput(input)
          if (invalid !== null) {
            results.push({ name: server.name, ok: false, error: invalid })
            continue
          }
          upsertMcp(scopeDir(body.scope), input)
          results.push({ name: server.name, ok: true })
        }
        sendJson(response, 200, { ok: results.every(item => item.ok), results, restartNeeded: true })
      }
      catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }))

  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp/check`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const body = (await readJsonBody(request)) as { id?: unknown, scope?: unknown }
        if (typeof body.id !== 'string') {
          sendJson(response, 400, { error: 'id is required' })
          return
        }
        const row = listMcp(scopeDir(body.scope)).find(item => item.id === body.id)
        if (row === undefined) {
          sendJson(response, 404, { error: 'server row not found' })
          return
        }
        sendJson(response, 200, await checkMcpRow(row))
      }
      catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) }) }
    },
  }))
  disposers.push(register({
    kind: 'exact',
    path: `${API_PREFIX}/mcp/copy`,
    handler: async (request: IncomingMessage, response: ServerResponse) => {
      if (request.method !== 'POST') {
        response.writeHead(405, { allow: 'POST' })
        response.end()
        return
      }
      if (!sameOrigin(request)) {
        sendJson(response, 403, { error: 'untrusted origin' })
        return
      }
      try {
        const body = (await readJsonBody(request)) as { id?: unknown, scope?: unknown, toScope?: unknown }
        if (typeof body.id !== 'string') {
          sendJson(response, 400, { error: 'id is required' })
          return
        }
        const source = listMcp(scopeDir(body.scope)).find(item => item.id === body.id)
        if (source === undefined) {
          sendJson(response, 404, { error: 'server row not found' })
          return
        }
        const scope = readScope(body.toScope)
        const id = upsertMcp(mcpScopeDir(scope, config.profileDirPath, config.dshHomePath), mcpRowToInput(source))
        sendJson(response, 200, { ok: true, id, scope, restartNeeded: true })
      }
      catch (error) { sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) }) }
    },
  }))
  return disposers
}
