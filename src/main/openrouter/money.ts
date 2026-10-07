import { ApplicationError } from '../../shared/contracts'
import { parseUsdDecimal } from '../../shared/openrouter'

const scale = 10n ** 18n
/** Expand the original JSON literal, never its binary floating point approximation. */
export function decimalLiteral(value: string): string {
  if (value.length > 100 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value)) throw new ApplicationError('INVALID_INPUT', 'Unsupported monetary precision.')
  const [mantissa, exponent = '0'] = value.toLowerCase().split('e'), [integer, fraction = ''] = mantissa!.split('.')
  const shift = BigInt(exponent)
  if (shift < -100n || shift > 100n) throw new ApplicationError('INVALID_INPUT', 'Unsupported monetary precision.')
  const digits = integer! + fraction, point = integer!.length + Number(shift)
  let expanded = point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length ? digits + '0'.repeat(point - digits.length) : digits.slice(0, point) + '.' + digits.slice(point)
  expanded = expanded.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return parseUsdDecimal(expanded)
}
export const moneyUnits = (value: string): bigint => { const [whole, fraction = ''] = parseUsdDecimal(value).split('.'); return BigInt(whole!) * scale + BigInt(fraction.padEnd(18, '0')) }
export function unitsMoney(value: bigint): string { return parseUsdDecimal(`${value / scale}.${(value % scale).toString().padStart(18, '0')}`.replace(/0+$/, '').replace(/\.$/, '')) }
export const addMoney = (values: readonly string[]): string => unitsMoney(values.reduce((sum, value) => sum + moneyUnits(value), 0n))
export const multiplyMoney = (value: string, count: number): string => unitsMoney(moneyUnits(value) * BigInt(count))
const moneyKeys = /^(?:cost|cost_usd|total_cost|usage(?:_daily|_weekly|_monthly)?|limit|limit_remaining)$/
/** Node 24 reviver context retains numeric provider literals at their reported precision. */
export function parseProviderJson(text: string, unknownInvalidMoney = false): unknown {
  const reviver = (key: string, value: unknown, context?: { source?: string }) => {
    if (moneyKeys.test(key) && typeof value === 'number') {
      if (!context?.source) throw new ApplicationError('UNAVAILABLE', 'Exact provider amount parsing is unavailable.')
      try { return decimalLiteral(context.source) } catch (error) { if (unknownInvalidMoney) return null; throw error }
    }
    return value
  }
  return JSON.parse(text, reviver)
}
