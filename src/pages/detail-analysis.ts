import type { JevAnalysis, JevProperty } from '@/data/jev'
import type { AnalysisLifecycleRecord } from '@/lib/analysis-lifecycle'
import type { AnalysisPropertyDefinition } from '@/lib/analysis-properties'

/** The registry controls presentation; retained evidence keeps its original definition. */
export function detailAnalysis(analysis: JevAnalysis, record: AnalysisLifecycleRecord, definitions: AnalysisPropertyDefinition[]): JevAnalysis {
  if(record.result==='none' || analysis.source==='No analysis')return {...analysis,properties:[],shots:[],transcript:[],narrative:[],duration:undefined}
  const properties: JevProperty[]=definitions.filter(item=>item.enabled).map(definition=>{
    const retained=analysis.properties.find(item=>item.id===definition.id)
    if(record.result==='partial'&&!record.completedGroupIds.includes(definition.category))return {id:definition.id,label:definition.name,section:definition.category,value:'Not assessed yet',status:'pending',missingReason:'This group has not completed in the local walkthrough.'}
    return retained ? {...retained,label:definition.name,section:definition.category} : {id:definition.id,label:definition.name,section:definition.category,value:'Not assessed',status:'unavailable',missingReason:'This property has no recorded result. Adding a definition does not analyse the creative.'}
  })
  const available=new Set(properties.filter(item=>item.status!=='pending'&&item.status!=='unavailable').map(item=>item.id))
  const shots=analysis.shots.filter(shot=>shot.findingIds.some(id=>available.has(id)))
  return {...analysis,properties,shots,transcript:analysis.transcript.filter(segment=>segment.findingIds.some(id=>available.has(id))),narrative:analysis.narrative.filter(moment=>shots.some(shot=>shot.id===moment.id))}
}

export function filterDetailProperties(properties: JevProperty[], params: URLSearchParams): JevProperty[] {
  return properties.filter(property=>{
    const status=property.review?.action || property.status
    const assessed=!['pending','unavailable'].includes(property.status)
    const confidence=property.confidence===undefined?'unknown':property.confidence>=.85?'high':property.confidence>=.7?'medium':'low'
    const values:Record<string,string>={category:property.section,assessment:assessed?'assessed':property.status,status,confidence,source:property.evidence?.source || 'unknown',origin:property.id.startsWith('custom:')?'custom':'standard'}
    return `${property.label} ${property.value} ${property.evidence?.quote || ''}`.toLowerCase().includes((params.get('q') || '').toLowerCase()) && Object.entries(values).every(([key,value])=>!params.get(key)||params.get(key)==='all'||params.get(key)===value)
  })
}
