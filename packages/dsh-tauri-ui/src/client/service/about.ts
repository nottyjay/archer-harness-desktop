import { invoke } from 'dsh-tauri/client'
import { CMD_OPEN_EXTERNAL_URL } from '../constants'

/** Open an http(s) URL in the system browser via the desktop host. */
export function openExternalUrl(url: string): Promise<void> {
  return invoke<void>(CMD_OPEN_EXTERNAL_URL, { url })
}
