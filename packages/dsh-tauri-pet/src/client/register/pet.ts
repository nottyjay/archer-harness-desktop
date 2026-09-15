import type {} from '@deepseek-ai/dsh-client-ui-renderer'
import type { ClientContext } from 'dsh-tauri/client'
import type { PetRuntimeContext } from '../types'
import { compat } from 'dsh-tauri/client'
import { PetSettings } from '../components/pet-settings'
import { PetPrefill } from '../components/prefill'
import { pendingPrefills } from '../config'
import {
  CONVERSATION_INPUT_LEFT_SLOT,
  PET_CLIENT_PLUGIN,
  PET_HATCH_PROMPT,
  PET_ICON_PATCH_EFFECT,
  PET_PREFILL_EFFECT,
  PET_PREFILL_ID,
  PET_PREFILL_ORDER,
  PET_PREFILL_PRIORITY,
  PET_SECTION_EFFECT,
  PET_SECTION_ID,
  PET_SECTION_ORDER,
} from '../constants'
import { registerSidebarPetIcon } from '../dom/sidebar-icon'
import { text } from '../locales'
import { chooseWorkspace } from '../utils/workspace'

export function registerPetSection(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.slots.inject('settings.section' as never, () => ctx.slots.register({
      name: 'settings.section',
      id: PET_SECTION_ID,
      order: PET_SECTION_ORDER,
      registrant: PET_CLIENT_PLUGIN,
      label: () => text('name'),
      inject: () => ({ onCreate: (close?: () => void) => createPetSession(ctx, close) }),
    } as never, PetSettings as never)),
    PET_SECTION_EFFECT,
  )
}

export function registerPetIconPatch(ctx: ClientContext): void {
  ctx.effect(() => registerSidebarPetIcon(), PET_ICON_PATCH_EFFECT)
}

export function registerPetPrefill(ctx: ClientContext): void {
  ctx.effect(() => {
    const dispose = ctx.slots.inject(CONVERSATION_INPUT_LEFT_SLOT as never, () => ctx.slots.register({
      name: CONVERSATION_INPUT_LEFT_SLOT,
      id: PET_PREFILL_ID,
      order: PET_PREFILL_ORDER,
      priority: PET_PREFILL_PRIORITY,
      registrant: PET_CLIENT_PLUGIN,
      inject: (sessionId: string) => ({ sessionId }),
    } as never, PetPrefill))
    return () => {
      pendingPrefills.clear()
      dispose()
    }
  }, PET_PREFILL_EFFECT)
}

/** Resolve the workspace and connector needed for standard session creation. */
export function resolveStartSession(ctx: ClientContext): {
  connectWorkspace: (id: string) => Promise<string>
  workspaceId: string
} {
  const runtime = compat(ctx) as unknown as PetRuntimeContext
  const workspaceId = chooseWorkspace(runtime)
  if (workspaceId === undefined || runtime.workspaces.connectWorkspace === undefined)
    throw new Error('PET_WORKSPACE_UNAVAILABLE: no workspace can create a pet session')
  return { connectWorkspace: runtime.workspaces.connectWorkspace, workspaceId }
}

/** Follow the standard new-session target order and install the one-shot draft. */
async function createPetSession(ctx: ClientContext, close?: () => void): Promise<void> {
  const runtime = compat(ctx) as unknown as PetRuntimeContext
  const start = resolveStartSession(ctx)
  if (runtime.sessions.open === undefined)
    throw new Error('PET_SESSION_UNAVAILABLE: session opener is unavailable')

  const sessionId = await start.connectWorkspace(start.workspaceId)
  if (!sessionId)
    throw new Error('PET_SESSION_UNAVAILABLE: workspace did not return a session id')

  pendingPrefills.set(sessionId, PET_HATCH_PROMPT)
  close?.()
  runtime.sessions.open(sessionId)
}
