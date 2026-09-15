import type { ConversationInputLeftProps } from '../types'
import { useEffect } from 'react'
import { pendingPrefills } from '../config'

export function PetPrefill({ sessionId, inputActions }: ConversationInputLeftProps): null {
  useEffect(() => {
    const draft = pendingPrefills.get(sessionId)
    if (draft === undefined)
      return
    pendingPrefills.delete(sessionId)
    inputActions.setDraft(draft)
  }, [inputActions, sessionId])
  return null
}
