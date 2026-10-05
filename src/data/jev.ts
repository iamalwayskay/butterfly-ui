import type { Ad } from "@/data/ads"
import { getWorkflowState, upsertWorkflowFinding, updateWorkflowFinding } from "@/lib/iterations"
import { standardAnalysisProperties, type AnalysisPropertySnapshot } from "@/lib/analysis-properties"

export type JevPropertyStatus = "ready" | "review" | "pending" | "unavailable" | "corrected"

export interface JevProperty {
  id: string
  section: string
  label: string
  value: string
  confidence?: number
  status: JevPropertyStatus
  evidence?: { at?: number; until?: number; quote: string; source: "Visual" | "On-screen text" | "Transcript" | "Meta delivery" }
  missingReason?: string
  valueType?: "text" | "category" | "time" | "number"
  provenance?: "Observed" | "Modelled"
  originalValue?: string
  review?: JevReviewDecision
  definitionSnapshot?: AnalysisPropertySnapshot
}

type Fixture = Omit<JevProperty, "id" | "section">
const p = (label: string, value: string, confidence: number, source: NonNullable<JevProperty["evidence"]>["source"], quote: string, at?: number): Fixture => ({ label, value, confidence, status: confidence < 0.72 ? "review" : "ready", evidence: { at, quote, source } })

const sections: Array<{ name: string; properties: Fixture[] }> = [
  { name: "Opening", properties: [
    p("Hook type", "Routine demonstration", .94, "Visual", "Creator applies serum at a mirror in the opening shot.", 0),
    p("Hook line", "An evening reset for stressed skin", .86, "On-screen text", "Evening reset", .4),
    p("First product appearance", "0.0 seconds", .99, "Visual", "Dropper and bottle are visible from the first frame.", 0),
    p("First face appearance", "0.0 seconds", .99, "Visual", "Creator is framed in close portrait from the first frame.", 0),
    p("Opening pace", "Measured", .83, "Visual", "One continuous application shot across the first three seconds.", 1.2),
    p("Pattern interrupt", "Dropper touches cheek", .79, "Visual", "The dropper movement is the first distinct action.", 1.1),
  ]},
  { name: "Story and structure", properties: [
    p("Creative format", "Creator-led routine", .96, "Visual", "Single creator demonstrates the product in a home setting.", 0),
    p("Narrative shape", "Ritual → benefit → product", .81, "Visual", "The action begins with a routine, then introduces the skin benefit.", 2.7),
    p("Scene count", "3 scenes", .76, "Visual", "Mirror application, product close-up, and finished-skin shot.", 4.3),
    p("Primary angle", "Calm barrier care", .91, "On-screen text", "Calm skin starts here", 5.8),
    p("Problem stated", "Sensitivity after a long day", .78, "Transcript", "By the evening, my skin feels like it has had enough.", 3.2),
    p("Benefit stated", "Comfort without heaviness", .88, "Transcript", "It settles everything without feeling heavy.", 7.1),
  ]},
  { name: "Offer and action", properties: [
    p("Product", "Barrier serum", .98, "On-screen text", "Kindred Barrier Serum", 9.4),
    p("Offer", "No offer shown", .93, "On-screen text", "No price, discount, or bundle appears in the creative.", 14.8),
    p("CTA strength", "Light", .85, "Transcript", "See the ritual", 15.2),
    p("CTA timing", "15.2 seconds", .95, "On-screen text", "See the ritual appears on the end frame.", 15.2),
    p("Destination cue", "Product detail page", .74, "On-screen text", "Shop Barrier Serum", 15.7),
    p("Urgency", "None", .92, "On-screen text", "No time or availability constraint is shown.", 15.7),
  ]},
  { name: "Proof and trust", properties: [
    p("Proof type", "Product demonstration", .89, "Visual", "Texture and application are shown at close range.", 8.4),
    p("Claim specificity", "General", .84, "Transcript", "Settles everything is not tied to a measured result.", 7.1),
    p("Social proof", "Not present", .91, "On-screen text", "No review, rating, or customer count appears.", 13.2),
    p("Authority cue", "Ingredient-led packaging", .69, "Visual", "The bottle label is visible, but the ingredient line is small.", 9.4),
    p("Demonstration clarity", "Clear", .9, "Visual", "Application amount and placement are easy to see.", 2.1),
  ]},
  { name: "Visual language", properties: [
    p("Creator presence", "Single creator", .99, "Visual", "One person appears throughout the creative.", 0),
    p("Framing", "Tight portrait", .97, "Visual", "Head and shoulders fill the 9:16 frame.", 0),
    p("Setting", "Bathroom at dusk", .88, "Visual", "Mirror, towel, and warm side light establish the setting.", 1.4),
    p("Lighting", "Warm naturalistic", .92, "Visual", "Directional amber light with soft shadow remains consistent.", 5),
    p("Product visibility", "High", .95, "Visual", "Dropper is visible during use and bottle receives a close-up.", 9.4),
    p("Text density", "Low", .9, "On-screen text", "Three short text moments appear across the cut.", 10.2),
    p("Brand prominence", "Moderate", .82, "Visual", "Brand is legible on pack and on the end frame.", 12.1),
  ]},
  { name: "Copy and sound", properties: [
    p("Voice", "First person", .94, "Transcript", "My skin feels like it has had enough.", 3.2),
    p("Tone", "Reassuring", .88, "Transcript", "Delivery is calm and avoids urgency.", 7.1),
    p("Reading level", "Plain language", .86, "Transcript", "Sentences are short and use familiar product language.", 6.4),
    p("Voiceover", "Creator voice", .96, "Transcript", "One creator voice is present across the cut.", 2.8),
    p("Music role", "Low ambient bed", .75, "Transcript", "Soft non-vocal music sits beneath the voice.", 2),
    { label: "Caption accuracy", value: "Checking", confidence: .44, status: "pending", evidence: { quote: "Caption alignment is still processing.", source: "Transcript" } },
  ]},
  { name: "Delivery context", properties: [
    p("Primary placement", "Instagram Reels", 1, "Meta delivery", "Placement supplied by the connected sample account."),
    p("Aspect ratio", "9:16", 1, "Meta delivery", "Creative dimensions are 665 × 1182."),
    { label: "Opening retention", value: "Not available", status: "unavailable", missingReason: "The sample account does not include frame-level retention." },
    { label: "Fatigue signal", value: "Checking", confidence: .38, status: "pending", evidence: { quote: "Waiting for enough daily delivery points.", source: "Meta delivery" } },
    { label: "Review state", value: "Human confirmed", confidence: 1, status: "corrected", evidence: { quote: "Confirmed from the source creative by Demo Owner.", source: "Visual" } },
  ]},
]

// Stable identities are explicit: changing a label, section or display order cannot renumber history.
const standardIds: Record<string,string> = {
  "Hook type":"opening-1", "Hook line":"opening-2", "First product appearance":"opening-3", "First face appearance":"opening-4", "Opening pace":"opening-5", "Pattern interrupt":"opening-6",
  "Creative format":"story-and-structure-1", "Narrative shape":"story-and-structure-2", "Scene count":"story-and-structure-3", "Primary angle":"story-and-structure-4", "Problem stated":"story-and-structure-5", "Benefit stated":"story-and-structure-6",
  "Product":"offer-and-action-1", "Offer":"offer-and-action-2", "CTA strength":"offer-and-action-3", "CTA timing":"offer-and-action-4", "Destination cue":"offer-and-action-5", "Urgency":"offer-and-action-6",
  "Proof type":"proof-and-trust-1", "Claim specificity":"proof-and-trust-2", "Social proof":"proof-and-trust-3", "Authority cue":"proof-and-trust-4", "Demonstration clarity":"proof-and-trust-5",
  "Creator presence":"visual-language-1", "Framing":"visual-language-2", "Setting":"visual-language-3", "Lighting":"visual-language-4", "Product visibility":"visual-language-5", "Text density":"visual-language-6", "Brand prominence":"visual-language-7",
  "Voice":"copy-and-sound-1", "Tone":"copy-and-sound-2", "Reading level":"copy-and-sound-3", "Voiceover":"copy-and-sound-4", "Music role":"copy-and-sound-5", "Caption accuracy":"copy-and-sound-6",
  "Primary placement":"delivery-context-1", "Aspect ratio":"delivery-context-2", "Opening retention":"delivery-context-3", "Fatigue signal":"delivery-context-4", "Review state":"delivery-context-5",
}
export const jevPropertyRegistry: JevProperty[] = sections.flatMap(section => section.properties.map(property => Object.freeze({ ...property, id: standardIds[property.label], section: section.name })))
Object.freeze(jevPropertyRegistry)
export const jevSectionNames = sections.map((section) => section.name)

export interface JevReviewDecision {
  action: "confirmed" | "corrected"
  value?: string
  reason: string
  reviewer: string
  at: string
  definitionSnapshot?: AnalysisPropertySnapshot
}
export interface JevShot { id: string; time: number; until: number; label: string; thumbnail?: string; findingIds: string[] }
export interface JevTranscript { id: string; time: number; text: string; findingIds: string[] }
export interface JevAnalysis {
  source: "Sample JEV analysis" | "No analysis"
  status: "ready" | "partial" | "not-run"
  properties: JevProperty[]
  shots: JevShot[]
  transcript: JevTranscript[]
  narrative: { id: string; time: number; label: string }[]
  duration?: number
}

// This is an explicit concept-cut fixture, not a transcript extracted from the still image.
const routineTranscript: JevTranscript[] = [
  {id:"routine-1",time:0,text:"An evening reset for stressed skin.",findingIds:["opening-2"]},
  {id:"routine-2",time:3.2,text:"By the evening, my skin feels like it has had enough.",findingIds:["story-and-structure-5"]},
  {id:"routine-3",time:7.1,text:"It settles everything without feeling heavy.",findingIds:["story-and-structure-6"]},
  {id:"routine-4",time:9.4,text:"Kindred Barrier Serum.",findingIds:["offer-and-action-1"]},
  {id:"routine-5",time:15.2,text:"See the ritual.",findingIds:["offer-and-action-4"]},
]
const sampleDefinitions: Record<string, {properties: JevProperty[]; transcript: JevTranscript[]; shots: Omit<JevShot,"thumbnail">[]}> = {
  "1235086835413596": {
    properties: jevPropertyRegistry.map(property => property.label === "Review state"
      ? {...property,value:"Not reviewed",status:"ready",confidence:undefined,evidence:undefined}
      : {...property}),
    transcript: routineTranscript,
    shots: [{id:"routine-opening",time:0,until:4.3,label:"Opening ritual",findingIds:["opening-1","opening-3"]},{id:"routine-benefit",time:4.3,until:9.4,label:"Skin comfort",findingIds:["story-and-structure-6"]},{id:"routine-product",time:9.4,until:15.2,label:"Product close-up",findingIds:["offer-and-action-1"]},{id:"routine-end",time:15.2,until:18,label:"End frame",findingIds:["offer-and-action-4"]}],
  },
  "2529793287483755": {
    properties: [
      {...p("Hook type","Product still life",.93,"Visual","Bottle and cloth establish a quiet product-led opening.",0),id:"opening-1",section:"Opening"},
      {...p("Hook line","The quiet part of your day",.88,"On-screen text","The quiet part of your day",0),id:"opening-2",section:"Opening"},
      {...p("First product appearance","0.0 seconds",.99,"Visual","Serum bottle is visible from the start.",0),id:"opening-3",section:"Opening"},
      {...p("Primary angle","Daily ritual",.81,"Visual","A single product is presented as part of a daily ritual.",0),id:"story-and-structure-4",section:"Story and structure"},
      {...p("Creator presence","No creator shown",.97,"Visual","Product-only composition.",0),id:"visual-language-1",section:"Visual language"},
    ], transcript: [], shots:[{id:"still-product",time:0,until:6,label:"Product still life",findingIds:["opening-1","opening-3"]}],
  },
  "1277290320948697": {
    properties: [
      {...p("Hook type","Dropper demonstration",.91,"Visual","Hands and a dropper lead the first frame.",0),id:"opening-1",section:"Opening"},
      {...p("Hook line","A little goes a long way",.84,"On-screen text","A little goes a long way",0),id:"opening-2",section:"Opening"},
      {...p("First product appearance","0.0 seconds",.97,"Visual","Dropper is visible immediately.",0),id:"opening-3",section:"Opening"},
      {...p("Primary angle","First touch",.8,"Visual","The application amount is the focus.",0),id:"story-and-structure-4",section:"Story and structure"},
    ],transcript:[],shots:[{id:"drop-opening",time:0,until:5,label:"First drop",findingIds:["opening-1","opening-3"]}],
  },
}
function validReview(value: JevReviewDecision | undefined): value is JevReviewDecision {
  return Boolean(value && (value.action === "confirmed" || value.action === "corrected") && typeof value.reason === "string" && typeof value.reviewer === "string" && typeof value.at === "string" && (value.action !== "corrected" || typeof value.value === "string"))
}
export function getJevAnalysis(ad: Ad, findingId?: string): JevAnalysis {
  const definition = ad.id.startsWith("upload-") || ad.status === "uploaded" || ad.analysisStatus === "not-run" ? undefined : sampleDefinitions[ad.id]
  if (!definition) return {source:"No analysis",status:"not-run",properties:[],shots:[],transcript:[],narrative:[]}
  const decisions=getWorkflowState().findings.filter(finding=>finding.adId===ad.id)
  const properties=jevPropertyRegistry.map(schema => {
    const found=definition.properties.find(property=>property.id===schema.id)
    const property: JevProperty=found ? {...found,evidence:found.evidence ? {...found.evidence} : undefined}
      : {id:schema.id,label:schema.label,section:schema.section,value:"Not assessed",status:"unavailable",missingReason:"This ad's sample analysis does not include this property."}
    property.valueType=/timing|appearance/i.test(property.label) ? "time" : /count/i.test(property.label) ? "number" : /type|format|shape|angle|placement/i.test(property.label) ? "category" : "text"
    property.provenance=property.evidence?.source === "Visual" || property.evidence?.source === "On-screen text" || property.evidence?.source === "Meta delivery" ? "Observed" : "Modelled"
    property.definitionSnapshot={...standardAnalysisProperties().find(item=>item.id===property.id)!,schemaRevision:1,provenance:"standard-fixture"}
    const exact=decisions.find(finding=>finding.id===findingId && finding.propertyId===property.id)
    const review=(exact || decisions.find(finding=>finding.propertyId===property.id))?.review
    return validReview(review) ? {...property,originalValue:property.value,value:review.action==="corrected" ? review.value! : property.value,status:review.action==="corrected" ? "corrected" as const : property.status,review} : property
  })
  const shots=definition.shots.map(shot=>({...shot,thumbnail:ad.poster,findingIds:[...shot.findingIds]}))
  return {source:"Sample JEV analysis",status:properties.some(property=>property.status==="pending" || property.status==="unavailable") ? "partial" : "ready",properties,shots,transcript:definition.transcript.map(segment=>({...segment})),narrative:shots.map(shot=>({id:shot.id,time:shot.time,label:shot.label})),duration:shots.at(-1)?.until}
}
export function getJevFindings(ad: Ad) { return getJevAnalysis(ad).properties }
export function saveJevReview(ad: Ad, propertyId: string, decision: Omit<JevReviewDecision,"at">, findingId?: string): boolean {
  const property=getJevAnalysis(ad,findingId).properties.find(item=>item.id===propertyId)
  if (!property || property.status==="pending" || property.status==="unavailable" || (decision.action==="corrected" && !decision.value?.trim())) return false
  const existing=getWorkflowState().findings.find(finding=>finding.adId===ad.id && finding.propertyId===propertyId && (!findingId || finding.id===findingId))
  if(findingId && !existing)return false
  const at=new Date().toISOString()
  return upsertWorkflowFinding({id:existing?.id || `finding-${ad.id}-${propertyId}`,adId:ad.id,propertyId,propertyDefinition:existing?.propertyDefinition || property.definitionSnapshot,label:existing?.label || property.label,value:decision.action==="corrected"?decision.value?.trim():property.value,evidence:property.evidence?.quote || property.missingReason || "No evidence supplied",owner:decision.reviewer,updatedAt:at,status:decision.action,sample:existing?.sample ?? false,review:{...decision,value:decision.value?.trim(),at,definitionSnapshot:property.definitionSnapshot}})
}
export function clearJevReview(adId: string, propertyId: string, findingId?:string): boolean {
  const existing=getWorkflowState().findings.find(finding=>finding.adId===adId && finding.propertyId===propertyId && (!findingId || finding.id===findingId))
  return existing ? updateWorkflowFinding(existing.id,{status:"review",review:undefined,value:undefined}) : true
}
