export interface BackupSettings {
  autoBackupEnabled: boolean
  autoBackupIntervalDays: number
  autoBackupOnStartup: boolean
  autoBackupOnChange: boolean
  backupRetentionCount: number
  backupIncludeCredentials: boolean
}

const INTERVAL_MIN = 1
const INTERVAL_MAX = 90
const INTERVAL_DEFAULT = 7

const RETENTION_MIN = 1
const RETENTION_MAX = 50
const RETENTION_DEFAULT = 10

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/// 归一化自动备份间隔（天）：限制在 [1, 90]，无效值回落默认 7。
export function normalizeIntervalDays(value: unknown): number {
  const n = toFiniteNumber(value)
  if (n === null)
    return INTERVAL_DEFAULT
  const rounded = Math.round(n)
  if (rounded < INTERVAL_MIN || rounded > INTERVAL_MAX)
    return INTERVAL_DEFAULT
  return rounded
}

/// 归一化保留备份份数：限制在 [1, 50]，无效值回落默认 10。
export function normalizeRetentionCount(value: unknown): number {
  const n = toFiniteNumber(value)
  if (n === null)
    return RETENTION_DEFAULT
  const rounded = Math.round(n)
  if (rounded < RETENTION_MIN || rounded > RETENTION_MAX)
    return RETENTION_DEFAULT
  return rounded
}
