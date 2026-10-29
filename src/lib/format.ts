const euro = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  // es-ES no agrupa los números de cuatro cifras por defecto (4900 €).
  useGrouping: 'always',
} as Intl.NumberFormatOptions)

const integer = new Intl.NumberFormat('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)

export const formatPrice = (value: number) => euro.format(Math.round(value))
export const formatInt = (value: number) => integer.format(Math.round(value))
export const formatDecimal = (value: number, decimals: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)

/** Cuota mensual de un préstamo francés (amortización constante). */
export function monthlyPayment(principal: number, annualRatePct: number, months: number) {
  if (principal <= 0) return 0
  const i = annualRatePct / 100 / 12
  if (i === 0) return principal / months
  return (principal * i) / (1 - Math.pow(1 + i, -months))
}
