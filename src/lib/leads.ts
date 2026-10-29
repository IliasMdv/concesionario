/**
 * Envío de solicitudes (información y prueba de conducción).
 *
 * Si se define VITE_LEADS_ENDPOINT, la solicitud se envía por POST como JSON a
 * ese endpoint. Sin endpoint configurado la web funciona en modo demostración:
 * la solicitud se guarda solo en este navegador (localStorage) y así se indica
 * al usuario. No se envía nada a ningún servidor.
 */

export type LeadKind = 'info' | 'drive'

export interface LeadPayload {
  kind: LeadKind
  name: string
  email: string
  phone: string
  message?: string
  date?: string
  slot?: string
  unit: string
  configuration: string
  total: number
  createdAt: string
}

export interface LeadResult {
  mode: 'sent' | 'demo'
  reference: string
}

const endpoint = import.meta.env.VITE_LEADS_ENDPOINT as string | undefined
const STORAGE_KEY = 'poniente:leads'

const reference = () => `PN-${Date.now().toString(36).toUpperCase().slice(-6)}`

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`El servidor respondió ${res.status}`)
    return { mode: 'sent', reference: reference() }
  }
  const ref = reference()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[]
    stored.push({ ...payload, reference: ref })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.slice(-20)))
  } catch {
    // Almacenamiento no disponible (modo privado): la confirmación se muestra igualmente.
  }
  await new Promise((r) => setTimeout(r, 650))
  return { mode: 'demo', reference: ref }
}

export const leadsMode: 'sent' | 'demo' = endpoint ? 'sent' : 'demo'
