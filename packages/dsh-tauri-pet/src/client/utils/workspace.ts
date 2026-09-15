import type { PetRuntimeContext, WorkspaceItem } from '../types'

function workspaceId(item: WorkspaceItem): string | undefined {
  return item.workspaceId ?? item.id
}

/** Follow the standard new-session target order: current, recent, then first workspace. */
export function chooseWorkspace(runtime: PetRuntimeContext): string | undefined {
  const current = runtime.sessions.list.getSnapshot().current
  const workspaces = runtime.workspaces.list.getSnapshot()
  const items = workspaces.items ?? []
  const currentItem = current === undefined
    ? undefined
    : items.find(item => item.sessionIds?.includes(current))
  const currentId = currentItem === undefined ? undefined : workspaceId(currentItem)
  if (currentId !== undefined)
    return currentId
  if (
    workspaces.recentWorkspaceId !== undefined
    && items.some(item => workspaceId(item) === workspaces.recentWorkspaceId)
  ) {
    return workspaces.recentWorkspaceId
  }
  return items.map(workspaceId).find((id): id is string => id !== undefined)
}
