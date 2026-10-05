import { Combobox, Field, SegmentedControl, SelectField, Switch, TextareaField } from "@/design-system/components"
import type { CreationCopy, CreationDestination, CreationMeta } from "@/lib/creation"

const label=(name:string,bulk:boolean)=>bulk?`Bulk ${name.toLowerCase()}`:name
type FieldErrors = Partial<Record<string,string>>
const fieldProps=(key:string,bulk:boolean,errors:FieldErrors)=>({id:`creation-${bulk?"bulk-":""}${key}`,name:`creation-${bulk?"bulk-":""}${key}`,autoComplete:"off",error:errors[key]})
export function CreationCopyFields({value,onChange,bulk=false,errors={}}:{value:CreationCopy;onChange:(next:CreationCopy)=>void;bulk?:boolean;errors?:FieldErrors}) {
  return <div className="creation-fields">
    <TextareaField {...fieldProps("primary",bulk,errors)} label={label("Primary text",bulk)} value={value.primary} onChange={event=>onChange({...value,primary:event.target.value})} rows={3} />
    <Field {...fieldProps("headline",bulk,errors)} label={label("Headline",bulk)} value={value.headline} onChange={event=>onChange({...value,headline:event.target.value})} />
    <Field {...fieldProps("description",bulk,errors)} label={label("Description",bulk)} value={value.description} onChange={event=>onChange({...value,description:event.target.value})} />
    <SelectField {...fieldProps("cta",bulk,errors)} label={label("CTA",bulk)} value={value.cta} onChange={event=>onChange({...value,cta:event.target.value})}>{["Learn more","Shop now","Sign up","Download","Contact us"].map(option=><option key={option}>{option}</option>)}</SelectField>
    <TextareaField {...fieldProps("script",bulk,errors)} label={label("Script or shot notes",bulk)} value={value.script} onChange={event=>onChange({...value,script:event.target.value})} rows={2} />
  </div>
}
export function CreationDestinationFields({value,onChange,bulk=false,errors={}}:{value:CreationDestination;onChange:(next:CreationDestination)=>void;bulk?:boolean;errors?:FieldErrors}) {
  return <div className="creation-fields"><Field {...fieldProps("url",bulk,errors)} autoComplete="url" label={label("Destination URL",bulk)} type="url" placeholder="https://your-store.example/product" value={value.url} onChange={event=>onChange({...value,url:event.target.value})} /><div className="creation-field-pair">{(["source","medium","campaign","content"] as const).map(key=><Field {...fieldProps(`utm-${key}`,bulk,errors)} key={key} label={bulk?`Bulk UTM ${key}`:`UTM ${key}`} value={value[key]} onChange={event=>onChange({...value,[key]:event.target.value})} />)}</div></div>
}
export function CreationSetupFields({value,onChange,bulk=false,errors={}}:{value:CreationMeta;onChange:(next:CreationMeta)=>void;bulk?:boolean;errors?:FieldErrors}) {
  const select=(name:string,key:keyof CreationMeta,options:{value:string;label:string}[],errorKey=String(key)) => <SelectField {...fieldProps(String(key),bulk,{[String(key)]:errors[errorKey]})} label={label(name,bulk)} value={String(value[key])} onChange={event=>onChange({...value,[key]:event.target.value})}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</SelectField>
  const options=(values:string[])=>values.map(value=>({value,label:value}))
  const campaignOptions=options(Array.from(new Set([value.campaign,"Kindred autumn · sample","Always-on skincare · sample","Barrier serum launch · sample","Retargeting catalogue · sample"])).filter(Boolean))
  const adSetOptions=options(Array.from(new Set([value.adSet,"Everyday routine · sample","Warm engagers · sample","UK skincare interests · sample","Site visitors 30 days · sample"])).filter(Boolean))
  const prefix=bulk?"Bulk ":""
  return <div className="creation-fields">
    {select("Account","account",[{value:"kindred",label:"Kindred · sample account (GBP)"},{value:"restricted",label:"Restricted account · unavailable"}],"permission")}
    <div className="creation-field-pair">{select("Page identity","page",options(["Kindred skincare","Kindred studio"]),"identity")}{select("Instagram identity","instagram",options(["@kindred.skin","@kindred.studio"]))}</div>
    <div className="creation-entity-grid">
      <div className="creation-entity-control"><SegmentedControl label={`${prefix}Campaign Source`} value={value.campaignMode} onValueChange={campaignMode=>onChange({...value,campaignMode})} options={[{value:"existing",label:"Existing"},{value:"new",label:"New"}]} />{value.campaignMode==="existing"?<Combobox label={`${prefix}Campaign`} value={value.campaign} onValueChange={campaign=>onChange({...value,campaign})} options={campaignOptions} searchPlaceholder="Search Campaign…" hint="Search the campaigns available to this sample account." />:<Field {...fieldProps("campaign",bulk,errors)} label={`${prefix}New Campaign Name`} value={value.campaign} onChange={event=>onChange({...value,campaign:event.target.value})} />}</div>
      <div className="creation-entity-control"><SegmentedControl label={`${prefix}Ad Set Source`} value={value.adSetMode} onValueChange={adSetMode=>onChange({...value,adSetMode})} options={[{value:"existing",label:"Existing"},{value:"new",label:"New"}]} />{value.adSetMode==="existing"?<Combobox label={`${prefix}Ad Set`} value={value.adSet} onValueChange={adSet=>onChange({...value,adSet})} options={adSetOptions} searchPlaceholder="Search Ad Sets…" hint="Search the ad sets in the selected sample campaign." />:<Field {...fieldProps("adSet",bulk,errors)} label={`${prefix}New Ad Set Name`} value={value.adSet} onChange={event=>onChange({...value,adSet:event.target.value})} />}</div>
    </div>
    <div className="creation-field-pair">{select("Objective","objective",options(["Sales","Leads","App"]))}{select("Special ad category","category",[{value:"",label:"Choose a declaration"},{value:"none",label:"None"},{value:"housing",label:"Housing"},{value:"employment",label:"Employment"},{value:"credit",label:"Financial products and services"},{value:"political",label:"Social issues, elections or politics"}])}</div>
    <details className="creation-advanced"><summary>{prefix}Advanced Delivery Controls</summary><div className="creation-fields">
      <Switch label={`${prefix}Advantage+ Audience`} checked={value.advantageAudience} onCheckedChange={advantageAudience=>onChange({...value,advantageAudience})} />
      <Switch label={`${prefix}Advantage+ Placements`} checked={value.advantagePlacements} onCheckedChange={advantagePlacements=>onChange({...value,advantagePlacements})} />
      <Switch label={`${prefix}Creative Enhancements`} checked={value.enhancements} onCheckedChange={enhancements=>onChange({...value,enhancements})} hint="Off by default for predictable creative delivery." />
      <p className="creation-note">These controls model a handoff choice, not actual Meta settings or policy approval.</p>
      <div className="creation-field-pair">{select("Budget type","budgetType",options(["Daily","Lifetime"]))}<Field {...fieldProps("budget",bulk,errors)} label={label("Budget (GBP)",bulk)} type="number" min="0.01" step="0.01" value={value.budget} onChange={event=>onChange({...value,budget:event.target.value})} /></div>
      <div className="creation-field-pair"><Field {...fieldProps("start",bulk,errors)} label={label("Start schedule",bulk)} type="datetime-local" value={value.start} onChange={event=>onChange({...value,start:event.target.value})} /><Field {...fieldProps("end",bulk,{end:errors.schedule})} label={label("End schedule",bulk)} type="datetime-local" value={value.end} onChange={event=>onChange({...value,end:event.target.value})} /></div>
      <p className="creation-note">Times use this browser's local timezone. Blank start means unscheduled; a paused receipt never begins delivery.</p>
    </div></details>
  </div>
}
