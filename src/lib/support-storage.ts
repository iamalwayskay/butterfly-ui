export type Person = { name: string; email: string; role: string }
export type Invite = { email: string; role: string; status: "pending" | "failed" }
export type TeamState = { version: 1; people: Person[]; invites: Invite[]; storageIssue?: string }
const initialPeople: Person[] = [{name:"Demo Owner",email:"owner@kindred.example",role:"Owner"},{name:"Demo Editor",email:"editor@kindred.example",role:"Editor"}]
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function readStored(key: string) { try { return localStorage.getItem(key) } catch { return null } }
export function readTeam(): TeamState {
  const fallback: TeamState = {version:1,people:initialPeople,invites:[{email:"mia@kindred.example",role:"Editor",status:"pending"}]}
  try {
    const raw = JSON.parse(readStored("butterfly-team") || "null")
    if (!raw) return fallback
    if(raw.version !== undefined && raw.version !== 1)return {...fallback,storageIssue:"This team record uses a newer format. Changes are disabled to preserve it."}
    if (!Array.isArray(raw.people) || !Array.isArray(raw.invites)) return fallback
    const identities = new Map<string,Person>()
    for(const person of raw.people) {
      if(!person || typeof person.name !== "string" || !person.name.trim() || typeof person.email !== "string" || !["Owner","Editor","Viewer"].includes(person.role))continue
      const email = person.email.trim().toLowerCase()
      if(!emailPattern.test(email))continue
      const existing = identities.get(email)
      if(!existing)identities.set(email,{name:person.name.trim(),email,role:person.role})
      else if(person.role === "Owner")existing.role = "Owner"
    }
    const people = [...identities.values()]
    let owner = people.find(p=>p.role === "Owner")
    if(!owner){owner=people.find(p=>p.email === initialPeople[0].email);if(owner)owner.role="Owner";else{owner={...initialPeople[0]};people.unshift(owner)}}
    for(const person of people)if(person !== owner && person.role === "Owner")person.role="Editor"
    const seen = new Set(people.map(p=>p.email.toLowerCase()))
    const invites: Invite[] = raw.invites.filter((i: Invite) => {
      if (!i || typeof i.email !== "string" || !emailPattern.test(i.email.trim()) || seen.has(i.email.trim().toLowerCase()) || !["Editor","Viewer"].includes(i.role)) return false
      seen.add(i.email.trim().toLowerCase());return true
    }).map((i: Invite)=>({email:i.email.trim().toLowerCase(),role:i.role,status:i.status === "failed" ? "failed" : "pending"}))
    return {version:1,people,invites}
  } catch { return fallback }
}
export function saveTeam(team: TeamState) {
  const current = readTeam()
  const owners = team.people.filter(p=>p.role === "Owner")
  const emails = team.people.map(p=>p.email.trim().toLowerCase())
  if(current.storageIssue || owners.length !== 1 || owners[0].email !== current.people.find(p=>p.role === "Owner")?.email || new Set(emails).size !== emails.length || team.people.some(p=>!emailPattern.test(p.email) || !["Owner","Editor","Viewer"].includes(p.role)))return false
  try { localStorage.setItem("butterfly-team",JSON.stringify({...team,people:team.people.map(p=>({...p,email:p.email.trim().toLowerCase()}))}));return true } catch { return false }
}
export type WorkspaceDefaults = { name: string; range: string; metric: string }
export function readWorkspace(): WorkspaceDefaults {
  const name = readStored("butterfly-workspace-name")?.trim()
  const range = readStored("butterfly-default-range") || "30"
  const metric = readStored("butterfly-default-metric") || "CPA"
  return {name:name && name.length >= 2 ? name : "Kindred",range:["7","30","90"].includes(range) ? range : "30",metric:["CPA","ROAS","Results","Spend"].includes(metric) ? metric : "CPA"}
}
export function saveWorkspaceDefaults(value: WorkspaceDefaults) {
  const entries = [["butterfly-workspace-name",value.name.trim()],["butterfly-default-range",value.range],["butterfly-default-metric",value.metric]]
  const previous = entries.map(([key])=>readStored(key))
  const written: number[] = []
  try {
    entries.forEach(([key,next],index)=>{localStorage.setItem(key,next);written.push(index)})
    window.dispatchEvent(new Event("butterfly-workspace-updated"));return true
  } catch {
    for (const index of written.reverse()) {
      try { const [key] = entries[index];const old = previous[index];if(old === null)localStorage.removeItem(key);else localStorage.setItem(key,old) } catch { /* Storage may have become unavailable. Do not report success. */ }
    }
    return false
  }
}
