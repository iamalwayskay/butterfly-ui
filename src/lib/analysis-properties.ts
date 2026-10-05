import { jevPropertyRegistry } from '@/data/jev'

export type AnalysisValueType = 'text' | 'category' | 'time' | 'number' | 'boolean'
export interface AnalysisPropertyDefinition {
  id: string; name: string; category: string; valueType: AnalysisValueType; description: string
  evidenceRequirement: 'none' | 'optional' | 'required'; enabled: boolean; order: number
  origin: 'standard' | 'custom'; version: number
}
export interface AnalysisPropertySnapshot extends AnalysisPropertyDefinition { provenance: 'standard-fixture' | 'local-override' | 'local-definition'; schemaRevision: number }
type Override = Partial<Pick<AnalysisPropertyDefinition, 'name' | 'description' | 'enabled' | 'order'>>
interface PropertyStore { version: 1; schemaRevision: number; nextId: number; overrides: Record<string, Override>; custom: AnalysisPropertyDefinition[] }
export const ANALYSIS_PROPERTIES_KEY = 'butterfly.analysis-properties.v1'
const empty = (): PropertyStore => ({ version: 1, schemaRevision: 1, nextId: 1, overrides: {}, custom: [] })
const valueTypes = ['text','category','time','number','boolean']
const evidenceTypes = ['none','optional','required']
export function standardAnalysisProperties(): AnalysisPropertyDefinition[] {
  return jevPropertyRegistry.map((property, order) => ({ id: property.id, name: property.label, category: property.section, valueType: /timing|appearance/i.test(property.label) ? 'time' : /count/i.test(property.label) ? 'number' : /type|format|shape|angle|placement/i.test(property.label) ? 'category' : 'text', description: `Assess ${property.label.toLowerCase()} in the source creative.`, evidenceRequirement: 'required', enabled: true, order, origin: 'standard', version: 1 }))
}
function validDefinition(value: AnalysisPropertyDefinition) {
  return value && typeof value.id === 'string' && value.id.startsWith('custom:') && typeof value.name === 'string' && !!value.name.trim() && typeof value.category === 'string' && !!value.category.trim() && typeof value.description === 'string' && valueTypes.includes(value.valueType) && evidenceTypes.includes(value.evidenceRequirement) && typeof value.enabled === 'boolean' && Number.isFinite(value.order) && Number.isInteger(value.version) && value.version > 0 && value.origin === 'custom'
}
export function readAnalysisProperties(): { data: PropertyStore; readOnly: boolean; reason?: string } {
  try {
    const raw = localStorage.getItem(ANALYSIS_PROPERTIES_KEY)
    if (!raw) return { data: empty(), readOnly: false }
    const value = JSON.parse(raw)
    if (value.version !== 1) return { data: empty(), readOnly: true, reason: 'This browser contains an unsupported property schema. Its saved data has been preserved.' }
    const ids = new Set(standardAnalysisProperties().map(item => item.id))
    if (!Number.isInteger(value.schemaRevision) || value.schemaRevision < 1 || !Number.isInteger(value.nextId) || value.nextId < 1 || !Array.isArray(value.custom) || !value.custom.every(validDefinition) || new Set(value.custom.map((item: AnalysisPropertyDefinition) => item.id)).size !== value.custom.length || !value.overrides || typeof value.overrides !== 'object' || Array.isArray(value.overrides) || Object.entries(value.overrides).some(([id, override]) => !ids.has(id) || !override || typeof override !== 'object' || Object.entries(override).some(([key, val]) => !['name','description','enabled','order'].includes(key) || (key === 'enabled' ? typeof val !== 'boolean' : key === 'order' ? typeof val !== 'number' || !Number.isFinite(val) : typeof val !== 'string' || (key === 'name' && !val.trim()))))) throw Error('Malformed')
    if (value.custom.some((item: AnalysisPropertyDefinition) => !/^custom:[1-9]\d*$/.test(item.id) || Number(item.id.split(':')[1]) >= value.nextId)) throw Error('Malformed identity')
    return { data: value, readOnly: false }
  } catch { return { data: empty(), readOnly: true, reason: 'Property settings could not be read. Saved data is preserved; changes are disabled.' } }
}
export function getAnalysisProperties(): AnalysisPropertyDefinition[] {
  const {data} = readAnalysisProperties()
  return [...standardAnalysisProperties().map(item => ({ ...item, ...data.overrides[item.id] })), ...data.custom].sort((a,b) => a.order-b.order)
}
export function snapshotAnalysisProperty(id: string): AnalysisPropertySnapshot | undefined {
  const definition = getAnalysisProperties().find(item => item.id === id)
  const {data}=readAnalysisProperties()
  const standard=standardAnalysisProperties().find(item=>item.id===id)
  const locallyOverridden=standard && Object.entries(data.overrides[id] || {}).some(([key,value])=>standard[key as keyof AnalysisPropertyDefinition]!==value)
  return definition ? { ...definition, schemaRevision: data.schemaRevision, provenance: definition.origin === 'custom' ? 'local-definition' : locallyOverridden ? 'local-override' : 'standard-fixture' } : undefined
}
function persist(data: PropertyStore) { try { localStorage.setItem(ANALYSIS_PROPERTIES_KEY, JSON.stringify(data)); return true } catch { return false } }
export function saveAnalysisProperty(input: Partial<AnalysisPropertyDefinition>): boolean {
  const loaded = readAnalysisProperties(); if (loaded.readOnly) return false
  const data = structuredClone(loaded.data), definitions = getAnalysisProperties(), existing = definitions.find(item => item.id === input.id)
  if (input.id && !existing) return false
  if (existing?.origin === 'standard') {
    if (Object.keys(input).some(key => !['id','name','description','enabled'].includes(key))) return false
    if ((input.name !== undefined && !input.name.trim()) || (input.description !== undefined && typeof input.description !== 'string') || (input.enabled !== undefined && typeof input.enabled !== 'boolean')) return false
    const {id: _id, ...override} = input
    data.overrides[existing.id] = {...data.overrides[existing.id], ...override}
    if (input.enabled !== undefined && input.enabled !== existing.enabled) data.schemaRevision++
  } else {
    const next: AnalysisPropertyDefinition = { id: existing?.id || `custom:${data.nextId}`, name: '', category: '', description: '', valueType: 'text', evidenceRequirement: 'optional', enabled: true, order: definitions.length ? Math.max(...definitions.map(item=>item.order))+1 : 0, version: 1, ...existing, ...input, origin: 'custom' }
    next.name=next.name.trim(); next.category=next.category.trim()
    if (!validDefinition(next) || definitions.some(item=>item.id!==next.id && item.name.toLowerCase()===next.name.toLowerCase())) return false
    const semantic = existing ? existing.enabled !== next.enabled || ((existing.enabled || next.enabled) && (existing.valueType !== next.valueType || existing.evidenceRequirement !== next.evidenceRequirement)) : next.enabled
    if (semantic) { data.schemaRevision++; next.version=(existing?.version || 0)+1 }
    if (existing) data.custom=data.custom.map(item=>item.id===existing.id ? next : item)
    else { data.custom.push(next); data.nextId++ }
  }
  return persist(data)
}
export function removeAnalysisOverride(id: string): boolean {
  const loaded=readAnalysisProperties(); if(loaded.readOnly) return false
  const data=structuredClone(loaded.data)
  if(data.overrides[id]?.enabled===false) data.schemaRevision++
  delete data.overrides[id]
  return persist(data)
}
export function reorderAnalysisProperty(id: string, direction: -1 | 1): boolean {
  const loaded=readAnalysisProperties(); if(loaded.readOnly) return false
  const definitions=getAnalysisProperties(), selected=definitions.find(item=>item.id===id)
  if(!selected)return false
  const group=definitions.filter(item=>item.category===selected.category), index=group.findIndex(item=>item.id===id), target=group[index+direction]
  if(!target)return false
  const data=structuredClone(loaded.data)
  for(const [item, order] of [[selected,target.order],[target,selected.order]] as const) {
    if(item.origin==='standard')data.overrides[item.id]={...data.overrides[item.id],order}
    else data.custom=data.custom.map(custom=>custom.id===item.id ? {...custom,order} : custom)
  }
  return persist(data)
}
export function resetAnalysisProperties(): boolean {
  const loaded=readAnalysisProperties(); if(loaded.readOnly)return false
  const data=empty(); data.nextId=loaded.data.nextId
  data.schemaRevision=loaded.data.schemaRevision+(loaded.data.custom.some(item=>item.enabled)||Object.values(loaded.data.overrides).some(item=>item.enabled===false)?1:0)
  return persist(data)
}
export function filterAnalysisProperties(definitions: AnalysisPropertyDefinition[], filters: { search?: string; category?: string; enabled?: string; valueType?: string; evidenceRequirement?: string; origin?: string }) {
  const search=(filters.search || '').toLowerCase().trim()
  return definitions.filter(item => (!search || `${item.name} ${item.description}`.toLowerCase().includes(search)) && Object.entries(filters).every(([key,value])=>key==='search'||!value||value==='all'||String(item[key as keyof AnalysisPropertyDefinition])===value))
}
