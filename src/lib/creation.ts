import type { Ad } from "@/data/ads"
import type { WorkflowState } from "@/lib/iterations"

export interface CreationCopy {primary:string;headline:string;description:string;cta:string;script:string}
export interface CreationDestination {url:string;source:string;medium:string;campaign:string;content:string}
export interface CreationMeta {account:string;page:string;instagram:string;campaignMode:string;campaign:string;adSetMode:string;adSet:string;objective:string;category:string;advantageAudience:boolean;advantagePlacements:boolean;enhancements:boolean;budget:string;budgetType:string;start:string;end:string}
export interface CreationSource {adId:string;propertyId?:string;findingId?:string;draftId?:string;sample:boolean;label:string}
export interface CreationDefaults {copy:CreationCopy;destination:CreationDestination;meta:CreationMeta}
export interface CreationAsset {id:string;name:string;type:"image"|"video"|"unsupported";width:number;height:number;src?:string;panel?:"left"|"right";fingerprint:string;mediaVersion?:string;issue?:string;sample:boolean;source?:CreationSource;variants:CreationCopy[];activeVariant:number;destination:CreationDestination;meta:CreationMeta;status:"draft"|"sending"|"error"|"paused";revision:number}
export interface CreationDraft {id:string;name:string;assets:CreationAsset[];defaults:CreationDefaults;updatedAt:string}
export interface CreationReceipt {id:string;draftId:string;assetId:string;revision:number;at:string;fixture:true;status:"PAUSED";snapshot:CreationAsset}
export interface CreationStore {version:1;drafts:CreationDraft[];receipts:CreationReceipt[];issue?:string}
export const CREATION_KEY="butterfly:creation:v1"
// Object URLs belong to the browser document, not a mounted composer or localStorage.
const sessionMedia=new Map<string,Map<string,string>>()
const ownedMedia=new Set<string>()
export function createCreationMediaUrl(file:File):string {const src=URL.createObjectURL(file);ownedMedia.add(src);return src}
export function rememberCreationMedia(draft:CreationDraft):void {
  const previous=sessionMedia.get(draft.id)
  sessionMedia.set(draft.id,new Map(draft.assets.flatMap(asset=>asset.src?.startsWith("blob:")&&asset.mediaVersion?[[asset.mediaVersion,asset.src]]:[])))
  for(const src of previous?.values()||[]){
    if(ownedMedia.has(src)&&![...sessionMedia.values()].some(assets=>[...assets.values()].includes(src))){URL.revokeObjectURL(src);ownedMedia.delete(src)}
  }
}
export function restoreCreationMedia(draft:CreationDraft):CreationDraft {
  const assets=sessionMedia.get(draft.id)
  return {...draft,assets:draft.assets.map(asset=>({...asset,src:(asset.mediaVersion&&assets?.get(asset.mediaVersion))||asset.src}))}
}
if(typeof window!=="undefined")window.addEventListener?.("pagehide",event=>{
  if(event.persisted)return
  ownedMedia.forEach(src=>URL.revokeObjectURL(src));ownedMedia.clear();sessionMedia.clear()
})
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value))
const id=()=>globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
export function newCreationDraft():CreationDraft {
  return {id:id(),name:"Untitled batch",assets:[],updatedAt:new Date().toISOString(),defaults:{copy:{primary:"",headline:"",description:"",cta:"Learn more",script:""},destination:{url:"",source:"facebook",medium:"paid_social",campaign:"",content:""},meta:{account:"kindred",page:"Kindred skincare",instagram:"@kindred.skin",campaignMode:"existing",campaign:"Kindred autumn · sample",adSetMode:"existing",adSet:"Everyday routine · sample",objective:"Sales",category:"",advantageAudience:true,advantagePlacements:true,enhancements:false,budget:"20",budgetType:"Daily",start:"",end:""}}}
}
export function makeCreationAsset(input:Pick<CreationAsset,"name"|"type"|"width"|"height"|"fingerprint"> & Partial<Pick<CreationAsset,"src"|"issue"|"sample"|"panel"|"source">>,defaults:CreationDefaults):CreationAsset {
  return {id:id(),...input,mediaVersion:id(),sample:input.sample??false,variants:[clone(defaults.copy)],activeVariant:0,destination:clone(defaults.destination),meta:clone(defaults.meta),status:"draft",revision:0}
}
export function generateCopyVariants(copy:CreationCopy):CreationCopy[] {
  return [{...copy,primary:[copy.headline,copy.primary].filter(Boolean).join("\n"),script:copy.script || copy.primary},{...copy,primary:[copy.primary,copy.description].filter(Boolean).join("\n"),script:copy.script || copy.headline}]
}
export function destinationUrl(destination:CreationDestination):string|null {
  try {const url=new URL(destination.url);if(!["http:","https:"].includes(url.protocol)||url.username||url.password)return null;for(const key of ["source","medium","campaign","content"] as const)if(destination[key].trim())url.searchParams.set(`utm_${key}`,destination[key].trim());return url.toString()}catch{return null}
}
export function creationIssues(asset:CreationAsset):{field:string;message:string}[] {
  const issues:{field:string;message:string}[]=[]
  const add=(field:string,message:string)=>issues.push({field,message})
  const copy=asset.variants[asset.activeVariant]
  if(asset.issue)add("media",asset.issue)
  else if(asset.type==="unsupported")add("media","Unsupported file. Choose an image or video.")
  else if(!asset.src || asset.width<=0 || asset.height<=0)add("media","Media unavailable. Reattach this file to preview and send the demo.")
  if(!copy?.primary.trim())add("primary","Primary text is missing.")
  if(!copy?.headline.trim())add("headline","Headline is missing.")
  if(!copy?.cta.trim())add("cta","Choose a call to action.")
  if(!destinationUrl(asset.destination))add("url","Enter an http or https destination without credentials.")
  if(asset.meta.account==="restricted")add("permission","This sample account lacks ad-creation permission.")
  if(!asset.meta.page || !asset.meta.instagram)add("identity","Choose Page and Instagram identities.")
  if(!asset.meta.campaign.trim())add("campaign","Enter a campaign name.")
  if(!asset.meta.adSet.trim())add("adSet","Enter an ad set name.")
  if(!["Sales","Leads","App"].includes(asset.meta.objective))add("objective","Choose Sales, Leads or App.")
  if(!asset.meta.category)add("category","Declare a special ad category or None.")
  if(!Number.isFinite(Number(asset.meta.budget)) || Number(asset.meta.budget)<=0)add("budget","Enter a positive demo budget in GBP.")
  if(asset.meta.end && (!asset.meta.start || Date.parse(asset.meta.end)<=Date.parse(asset.meta.start)))add("schedule","End must be after a specified start.")
  if((asset.meta.start&&!Number.isFinite(Date.parse(asset.meta.start)))||(asset.meta.end&&!Number.isFinite(Date.parse(asset.meta.end))))add("schedule","Use a valid schedule.")
  return issues
}
export function resolveCreationSource(params:URLSearchParams,ads:Ad[],workflow:Pick<WorkflowState,"drafts"|"findings">):{asset?:CreationAsset;error?:string} {
  const draftId=params.get("draft") || undefined, findingId=params.get("finding") || params.get("findingId") || undefined
  const draft=workflow.drafts.find(item=>item.id===draftId),finding=workflow.findings.find(item=>item.id===findingId)
  const adId=params.get("ad") || draft?.adId || finding?.adId
  if(!adId && !draftId && !findingId)return {}
  const ad=ads.find(item=>item.id===adId)
  if(!ad || (draftId&&(!draft||draft.adId!==ad.id)) || (findingId&&(!finding||finding.adId!==ad.id)))return {error:"Source unavailable or mismatched. Start from a visible ad or saved draft; no context was inferred."}
  const propertyId=params.get("property") || finding?.propertyId || draft?.propertyId
  if((finding?.propertyId&&propertyId!==finding.propertyId)||(draft?.propertyId&&propertyId!==draft.propertyId))return {error:"Source property does not match this finding or draft."}
  const defaults=newCreationDraft().defaults
  const sample=!ad.id.startsWith("upload-")
  const uploadContext=ad.uploadContext
  defaults.copy={primary:sample?ad.read.hookLine:uploadContext?.notes || "",headline:uploadContext?.product || ad.product,description:sample?"":uploadContext?.audience || "",cta:"Learn more",script:draft?.change || ""}
  if(!sample&&uploadContext?.destination)defaults.destination.url=uploadContext.destination
  const asset=makeCreationAsset({name:ad.name || ad.product,type:ad.uploadType==="video"?"video":ad.uploadType==="pdf"?"unsupported":"image",src:ad.uploadUrl || (sample?ad.poster:undefined),width:ad.w,height:ad.h,fingerprint:`ad:${ad.id}`,sample,panel:ad.posterPanel,source:{adId:ad.id,propertyId,findingId,draftId,sample,label:draft?.change || finding?.label || ad.name || ad.product}},defaults)
  return {asset}
}
function serializable<T>(value:T):T {return JSON.parse(JSON.stringify(value,(key,value)=>key==="src"&&typeof value==="string"&&value.startsWith("blob:")?undefined:value))}
function strings(value:unknown,keys:string[]):boolean {return Boolean(value&&typeof value==="object"&&keys.every(key=>typeof (value as Record<string,unknown>)[key]==="string"))}
const validCopy=(value:unknown)=>strings(value,["primary","headline","description","cta","script"])
const validDestination=(value:unknown)=>strings(value,["url","source","medium","campaign","content"])
function validMeta(value:unknown):boolean {const meta=value as CreationMeta;return strings(value,["account","page","instagram","campaignMode","campaign","adSetMode","adSet","objective","category","budget","budgetType","start","end"])&&[meta.advantageAudience,meta.advantagePlacements,meta.enhancements].every(item=>typeof item==="boolean")}
const validMediaVersion=(value:unknown)=>value===undefined||(typeof value==="string"&&(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)||/^local-\d+-[a-z0-9]+$/.test(value)))
function validAsset(value:unknown):value is CreationAsset {const asset=value as CreationAsset;return Boolean(strings(value,["id","name","fingerprint"])&&["image","video","unsupported"].includes(asset.type)&&["draft","sending","error","paused"].includes(asset.status)&&[asset.width,asset.height,asset.revision].every(item=>Number.isFinite(item)&&item>=0)&&typeof asset.sample==="boolean"&&validMediaVersion(asset.mediaVersion)&&(!asset.source||(strings(asset.source,["adId","label"])&&typeof asset.source.sample==="boolean"))&&Array.isArray(asset.variants)&&asset.variants.length&&asset.variants.every(validCopy)&&Number.isInteger(asset.activeVariant)&&asset.activeVariant>=0&&asset.activeVariant<asset.variants.length&&validDestination(asset.destination)&&validMeta(asset.meta))}
function validDraft(value:unknown):value is CreationDraft {const draft=value as CreationDraft;return Boolean(strings(value,["id","name","updatedAt"])&&validCopy(draft.defaults?.copy)&&validMeta(draft.defaults?.meta)&&validDestination(draft.defaults?.destination)&&Array.isArray(draft.assets)&&draft.assets.every(validAsset))}
function validReceipt(value:unknown):value is CreationReceipt {const receipt=value as CreationReceipt;return strings(value,["id","draftId","assetId","at"])&&receipt.fixture===true&&receipt.status==="PAUSED"&&Number.isInteger(receipt.revision)&&validAsset(receipt.snapshot)}
export function readCreationStore():CreationStore {
  const empty:CreationStore={version:1,drafts:[],receipts:[]}
  try {
    const raw=window.localStorage.getItem(CREATION_KEY);if(!raw)return empty
    const value=JSON.parse(raw)
    if(value.version!==undefined&&value.version!==0&&value.version!==1)return {...empty,issue:"This creation store uses a newer format. It is read-only to preserve your data."}
    const drafts=value.version===0&&value.draft?[value.draft]:value.drafts
    if(!Array.isArray(drafts)||!drafts.every(validDraft)||!Array.isArray(value.receipts??[])||!(value.receipts??[]).every(validReceipt))return {...empty,issue:"Saved creation data could not be read. It has not been overwritten."}
    return {version:1,drafts,receipts:value.receipts??[]}
  }catch{return {...empty,issue:"Browser creation storage is unavailable or unreadable. Existing data is unchanged."}}
}
function writeCreationStore(store:CreationStore):boolean {try{window.localStorage.setItem(CREATION_KEY,JSON.stringify(serializable(store)));return true}catch{return false}}
export function saveCreationDraft(draft:CreationDraft):boolean {
  const store=readCreationStore();if(store.issue||!validDraft(draft))return false
  return writeCreationStore({...store,drafts:[serializable(draft),...store.drafts.filter(item=>item.id!==draft.id)]})
}
export function recordPausedReceipt(draft:CreationDraft,asset:CreationAsset):CreationReceipt|null {
  const store=readCreationStore();if(store.issue||creationIssues(asset).length)return null
  const prior=store.receipts.find(receipt=>receipt.draftId===draft.id&&receipt.assetId===asset.id&&receipt.revision===asset.revision);if(prior)return prior
  const receipt:CreationReceipt={id:`demo-${id()}`,draftId:draft.id,assetId:asset.id,revision:asset.revision,at:new Date().toISOString(),fixture:true,status:"PAUSED",snapshot:serializable(asset)}
  const updated={...draft,assets:draft.assets.map(row=>row.id===asset.id?{...row,status:"paused" as const}:row)}
  return writeCreationStore({...store,drafts:[serializable(updated),...store.drafts.filter(item=>item.id!==draft.id)],receipts:[receipt,...store.receipts]})?receipt:null
}
