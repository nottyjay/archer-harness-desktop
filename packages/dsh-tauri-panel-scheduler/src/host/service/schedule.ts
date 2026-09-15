import type { SchedulerSchedule, Weekday } from '../types'
import { parseCronExpression } from 'cron-schedule'

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const MAX_EVERY_MINUTES = 525_600
const MAX_EVERY_DAYS = 366

export function parseTimeToMinutes(time: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match)
    return undefined
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : undefined
}

const WEEKDAY_TO_CRON_DAY: Record<Weekday, number> = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }
type TimeSchedule = Extract<SchedulerSchedule, { kind: 'daily' | 'workdays' | 'weekly' | 'monthly' }>

function toCronExpression(schedule: TimeSchedule): string | undefined {
  const minutes = parseTimeToMinutes(schedule.time)
  if (minutes === undefined)
    return undefined
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  if (schedule.kind === 'daily')
    return `${minute} ${hour} * * *`
  if (schedule.kind === 'workdays')
    return `${minute} ${hour} * * 1-5`
  if (schedule.kind === 'monthly')
    return `${minute} ${hour} ${schedule.day} * *`
  const days = schedule.weekdays.map(day => WEEKDAY_TO_CRON_DAY[day])
  return days.length > 0 ? `${minute} ${hour} * * ${[...new Set(days)].sort((a, b) => a - b).join(',')}` : undefined
}

function anchoredOccurrence(anchor: string, step: number, from: number): number | undefined {
  const base = new Date(anchor).getTime()
  if (!Number.isFinite(base) || step <= 0)
    return undefined
  const index = Math.max(0, Math.floor((from - base) / step) + 1)
  return base + index * step
}

export function nextOccurrence(schedule: SchedulerSchedule, from: number): number | undefined {
  switch (schedule.kind) {
    case 'once': {
      const at = new Date(schedule.at).getTime()
      return Number.isFinite(at) && at > from ? at : undefined
    }
    case 'hourly': {
      if (!Number.isInteger(schedule.minute) || schedule.minute < 0 || schedule.minute > 59)
        return undefined
      const next = new Date(from + MINUTE_MS)
      next.setMinutes(schedule.minute, 0, 0)
      if (next.getTime() <= from)
        next.setHours(next.getHours() + 1)
      return next.getTime()
    }
    case 'interval':
      if (!Number.isFinite(schedule.everyMinutes) || schedule.everyMinutes < 1 || schedule.everyMinutes > MAX_EVERY_MINUTES)
        return undefined
      return schedule.anchor ? anchoredOccurrence(schedule.anchor, schedule.everyMinutes * MINUTE_MS, from) : from + schedule.everyMinutes * MINUTE_MS
    case 'custom':
      if (!Number.isInteger(schedule.everyDays) || schedule.everyDays < 1 || schedule.everyDays > MAX_EVERY_DAYS || parseTimeToMinutes(schedule.time) === undefined)
        return undefined
      return anchoredOccurrence(schedule.anchor, schedule.everyDays * DAY_MS, from)
    case 'daily': case 'workdays': case 'weekly': case 'monthly': {
      const expression = toCronExpression(schedule)
      return expression ? parseCronExpression(expression).getNextDate(new Date(from)).getTime() : undefined
    }
  }
}

export function validateSchedule(schedule: unknown): schedule is SchedulerSchedule {
  if (!schedule || typeof schedule !== 'object')
    return false
  const value = schedule as Partial<SchedulerSchedule>
  if (value.kind === 'once')
    return typeof value.at === 'string' && Number.isFinite(new Date(value.at).getTime())
  if (value.kind === 'hourly')
    return Number.isInteger(value.minute) && (value.minute as number) >= 0 && (value.minute as number) <= 59
  if (value.kind === 'interval')
    return Number.isFinite(value.everyMinutes) && (value.everyMinutes as number) >= 1 && (value.everyMinutes as number) <= MAX_EVERY_MINUTES && (value.anchor === undefined || (typeof value.anchor === 'string' && Number.isFinite(new Date(value.anchor).getTime())))
  if (value.kind === 'custom')
    return Number.isInteger(value.everyDays) && (value.everyDays as number) >= 1 && (value.everyDays as number) <= MAX_EVERY_DAYS && typeof value.anchor === 'string' && Number.isFinite(new Date(value.anchor).getTime()) && typeof value.time === 'string' && parseTimeToMinutes(value.time) !== undefined
  if (value.kind === 'daily' || value.kind === 'workdays')
    return typeof value.time === 'string' && parseTimeToMinutes(value.time) !== undefined
  if (value.kind === 'monthly')
    return Number.isInteger(value.day) && (value.day as number) >= 1 && (value.day as number) <= 31 && typeof value.time === 'string' && parseTimeToMinutes(value.time) !== undefined
  if (value.kind === 'weekly')
    return typeof value.time === 'string' && parseTimeToMinutes(value.time) !== undefined && Array.isArray(value.weekdays) && value.weekdays.length > 0 && value.weekdays.every(day => Object.hasOwn(WEEKDAY_TO_CRON_DAY, day as Weekday))
  return false
}

export function localTimeZone(): string {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }
  catch {
    return 'UTC'
  }
}
