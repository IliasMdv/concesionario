import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { EXTRAS, FINANCE, RIMS, UNITS, type Extra, type RimOption, type Unit } from '../data/car'
import { monthlyPayment } from './format'
import type { LeadKind } from './leads'

export interface Configuration {
  unitId: string
  rimId: string
  extras: string[]
  downPct: number
  term: number
}

export interface Totals {
  unit: Unit
  rim: RimOption
  extras: Extra[]
  base: number
  total: number
  down: number
  monthly: number
}

interface StoreValue {
  config: Configuration
  update: (patch: Partial<Configuration>) => void
  toggleExtra: (id: string) => void
  totals: Totals
  lead: LeadKind | null
  openLead: (kind: LeadKind) => void
  closeLead: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function computeTotals(config: Configuration): Totals {
  const unit = UNITS.find((u) => u.id === config.unitId) ?? UNITS[0]
  const rim = RIMS.find((r) => r.id === config.rimId) ?? RIMS[0]
  const extras = EXTRAS.filter((e) => config.extras.includes(e.id))
  const total = unit.price + rim.price + extras.reduce((sum, e) => sum + e.price, 0)
  const down = (total * config.downPct) / 100
  return {
    unit,
    rim,
    extras,
    base: unit.price,
    total,
    down,
    monthly: monthlyPayment(total - down, FINANCE.tin, config.term),
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Configuration>({
    unitId: UNITS[0].id,
    rimId: RIMS[0].id,
    extras: ['warranty'],
    downPct: 30,
    term: 48,
  })
  const [lead, setLead] = useState<LeadKind | null>(null)

  const update = useCallback((patch: Partial<Configuration>) => setConfig((c) => ({ ...c, ...patch })), [])
  const toggleExtra = useCallback(
    (id: string) =>
      setConfig((c) => ({ ...c, extras: c.extras.includes(id) ? c.extras.filter((e) => e !== id) : [...c.extras, id] })),
    [],
  )
  const openLead = useCallback((kind: LeadKind) => setLead(kind), [])
  const closeLead = useCallback(() => setLead(null), [])
  const totals = useMemo(() => computeTotals(config), [config])

  const value = useMemo(
    () => ({ config, update, toggleExtra, totals, lead, openLead, closeLead }),
    [config, update, toggleExtra, totals, lead, openLead, closeLead],
  )
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return value
}
