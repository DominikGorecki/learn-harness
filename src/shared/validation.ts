import { ApplicationError } from './contracts'

export function strictRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApplicationError('INVALID_INPUT', 'Expected a valid object.')
  const record = value as Record<string, unknown>
  if (Object.keys(record).some(key => !keys.includes(key))) throw new ApplicationError('INVALID_INPUT', 'Unexpected field in the request.')
  return record
}

export function boundedText(value: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim()) || value.includes('\0')) {
    throw new ApplicationError('INVALID_INPUT', `${label} must be ${allowEmpty ? 'no more than' : 'between 1 and'} ${max.toLocaleString('en-US')} characters.`)
  }
  return value.trim()
}

export function textList(value: unknown, label: string, maxItems: number, maxLength: number, minItems = 0): string[] {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) throw new ApplicationError('INVALID_INPUT', `${label} has an invalid number of items.`)
  return value.map(item => boundedText(item, label, maxLength))
}

export function timestamp(value: unknown): string {
  const text = boundedText(value, 'Timestamp', 40)
  if (!Number.isFinite(Date.parse(text))) throw new ApplicationError('INVALID_INPUT', 'A saved timestamp is invalid.')
  return text
}

export function identifier(value: unknown): string {
  const text = boundedText(value, 'Identifier', 100)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(text)) throw new ApplicationError('INVALID_INPUT', 'Invalid identifier.')
  return text
}
