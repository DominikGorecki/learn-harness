/** Only ledger display labels/provider tier labels are projected; source/topic state is untouched. */
export function unsafeLedgerLabel(value: string): boolean {
  return /(?:https?:|file:)\/\/|\bBearer\s|\bsk-or-[a-zA-Z0-9_-]+|(?:^|\s)[a-zA-Z]:[\\/]|^\\\\|^\/(?:[^\s/]+\/)/i.test(value)
}
export const ledgerDisplayLabel = (value: string, fallback: string): string => unsafeLedgerLabel(value) ? fallback : value
export function ledgerPriceVariant(value: unknown): string | null {
  if (value == null) return null
  return typeof value === 'string' && value.length <= 128 && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value) && !unsafeLedgerLabel(value) ? value : 'unsupported'
}
