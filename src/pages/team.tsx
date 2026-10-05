import { useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { Info, Mail, RotateCw, Trash2, UserPlus, X } from "lucide-react"
import { Popover } from "radix-ui"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogActions, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogCancel, Badge, Banner, Toast, Button, DropdownMenu, Field, IconButton, InlineAlert, MemberRow, SelectField, StatePanel, WorkspacePageHeader } from "@/design-system/components"
import { Page } from "@/components/page"
import { appPath } from "@/lib/app-location"
import { readTeam, readWorkspace, saveTeam, type TeamState } from "@/lib/support-storage"
import "@/pages/support.css"

const roleOptions = [{value:"Editor",label:"Editor"},{value:"Viewer",label:"Viewer"}]
export function Team() {
  const [params,setParams] = useSearchParams()
  const fixtureState = params.get("state") || "default"
  const [team,setTeam] = useState<TeamState>(()=>{
    const stored = readTeam()
    return fixtureState === "invite-failure" ? {...stored,invites:stored.invites.length ? stored.invites.map((invite,index)=>index === 0 ? {...invite,status:"failed"} : invite) : [{email:"alex@kindred.example",role:"Viewer",status:"failed"}]} : stored
  })
  const {people,invites} = team
  const readOnly = fixtureState === "readonly" || fixtureState === "permission" || Boolean(team.storageIssue)
  const [email,setEmail] = useState("")
  const [role,setRole] = useState("Viewer")
  const [message,setMessage] = useState("")
  const [inviteOpen,setInviteOpen] = useState(false)
  const [storageError,setStorageError] = useState(false)
  const [pendingRemoval,setPendingRemoval] = useState<string | null>(null)
  const removeTriggerRef = useRef<HTMLButtonElement | null>(null)
  const membersHeadingRef = useRef<HTMLHeadingElement>(null)
  const inviteHeadingRef = useRef<HTMLHeadingElement>(null)
  const inviteTriggerRef = useRef<HTMLButtonElement>(null)
  const inviteActionRef = useRef<HTMLButtonElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const removedRef = useRef(false)
  const selected = people.find(p=>p.email === pendingRemoval)
  function commit(next: TeamState) {
    if(readOnly)return false
    if(!saveTeam(next)){setStorageError(true);return false}
    setTeam(next);setStorageError(false);return true
  }
  function addInvite(event: FormEvent) {
    event.preventDefault();if(readOnly)return
    const next = email.trim().toLowerCase()
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)){setMessage("Enter a valid email address.");emailRef.current?.focus();return}
    if(people.some(p=>p.email.toLowerCase() === next)){setMessage("That address is already a member.");emailRef.current?.focus();return}
    if(invites.some(i=>i.email === next)){setMessage("That address already has a pending invitation.");emailRef.current?.focus();return}
    if(commit({...team,invites:[...invites,{email:next,role,status:"pending"}]})){
      setEmail("");setMessage("Invitation added to this local preview. No email was sent.");setInviteOpen(false)
    }
  }
  return <Page className="support-page team-page">
    <WorkspacePageHeader title="Team" breadcrumb={[{label:readWorkspace().name,href:appPath("/ads")},{label:"Team"}]} description="Manage who can review ads and keep notes in this workspace." metadata={`${people.length} Members`} actions={<Button variant="primary" ref={inviteTriggerRef} icon={<UserPlus />} disabled={readOnly} onClick={()=>setInviteOpen(true)}>Invite Member</Button>} />
    {fixtureState === "loading" ? <StatePanel tone="loading" title="Loading Team" description="Reading the local workspace fixture." /> : fixtureState === "error" ? <StatePanel tone="error" title="Team Could Not Be Loaded" description="The fixture failed. No member data changed." actions={<Button variant="secondary" onClick={()=>setParams({})}>Retry</Button>} /> : fixtureState === "empty" ? <StatePanel tone="empty" title="No Other Team Members" description="Empty-team preview. Your saved members are unchanged." actions={<Button variant="primary" onClick={()=>{setParams({});setInviteOpen(true)}}>Invite Someone</Button>} /> : <>
      {readOnly ? <Banner tone="permission" title={fixtureState === "permission" ? "Owner Permission Required" : "Team Is Read-Only"}>{team.storageIssue || "You can view members and invitations, but cannot change them in this fixture."}</Banner> : null}
      {storageError ? <InlineAlert tone="error">Team changes were not saved. Existing records are unchanged.</InlineAlert> : null}
      <div className="team-layout"><div className="team-layout__people"><section className="support-section" aria-labelledby="members-title">
        <div className="support-section__head"><div><p className="support-eyebrow">Workspace Access</p><div className="support-heading-with-help"><h2 id="members-title" ref={membersHeadingRef} tabIndex={-1}>Members</h2><Popover.Root><Popover.Trigger asChild><IconButton variant="quiet" icon={<Info />} label="About Team Roles" /></Popover.Trigger><Popover.Portal><Popover.Content className="support-role-popover" sideOffset={8} collisionPadding={12}><Popover.Arrow className="support-role-popover__arrow" /><strong>Team Roles</strong><dl><div><dt>Owner</dt><dd>Controls workspace access and settings.</dd></div><div><dt>Editor</dt><dd>Reviews creative, creates drafts and manages notes.</dd></div><div><dt>Viewer</dt><dd>Can inspect ads and review context without making changes.</dd></div></dl></Popover.Content></Popover.Portal></Popover.Root></div></div><span>{people.length} People</span></div>
        {people.length === 1 ? <StatePanel compact tone="empty" title="No Other Team Members" description="Invite someone to join this local workspace preview." /> : null}
        <div className="support-list">{people.map(person=><MemberRow key={person.email} name={person.name} email={person.email} role={person.role} roles={person.role === "Owner" ? undefined : roleOptions} disabled={readOnly} onRoleChange={person.role === "Owner" ? undefined : nextRole=>{if(commit({...team,people:people.map(item=>item.email === person.email ? {...item,role:nextRole} : item)}))setMessage(`${person.name} is now a ${nextRole}.`)}} actions={person.role === "Owner" ? <span /> : <DropdownMenu label={`More actions for ${person.name}`} items={[{id:"remove",label:`Remove ${person.name}`,icon:Trash2,destructive:true,disabled:readOnly,onSelect:()=>{removeTriggerRef.current=(document.activeElement as HTMLElement)?.closest(".bf-menu")?.querySelector(".bf-menu__trigger") as HTMLButtonElement | null;removedRef.current=false;setPendingRemoval(person.email)}}]} />}/>)}</div>
      </section>
      <section className="support-section" aria-labelledby="invite-title">
        <div className="support-section__head"><div><p className="support-eyebrow">Invitations</p><h2 id="invite-title" ref={inviteHeadingRef} tabIndex={-1}>Pending Invitations</h2></div><span>{invites.length} Pending</span></div>
        <p className="support-note">Invitations are local fixture records. No invitation email is sent, including when you resend.</p>
        {message && !message.startsWith("Enter") && !message.startsWith("That") ? <Toast returnFocusRef={inviteTriggerRef} open={Boolean(message)} onOpenChange={open=>{if(!open)setMessage("")}} title={message} /> : null}
        {invites.length ? <div className="support-list support-list--invites">{invites.map(invite=><div className="support-invite-row" key={invite.email}><span className="support-invite-row__icon"><Mail aria-hidden="true" /></span><div className="support-invite-row__identity"><strong>{invite.email}</strong><span>{invite.role}</span></div><Badge variant={invite.status === "failed" ? "error" : "review"}>{invite.status === "failed" ? "Delivery failed" : "Pending"}</Badge><DropdownMenu label={`More actions for invitation to ${invite.email}`} items={[{id:"resend",label:"Resend Invitation",icon:RotateCw,disabled:readOnly,onSelect:()=>{if(commit({...team,invites:invites.map(item=>item.email === invite.email ? {...item,status:"pending"} : item)}))setMessage(`Invitation to ${invite.email} reset locally. No email was sent.`)}},{id:"cancel",label:"Cancel Invitation",icon:X,destructive:true,disabled:readOnly,onSelect:()=>{if(commit({...team,invites:invites.filter(item=>item.email !== invite.email)})){setMessage(`Invitation to ${invite.email} cancelled locally.`);inviteHeadingRef.current?.focus()}}}]} /></div>)}</div> : <StatePanel compact tone="empty" title="No Pending Invitations" />}
      </section></div>
      <aside className="team-context" aria-label="Workspace access overview">
        <section className="team-context__inverse"><span>{readWorkspace().name} Access</span><strong>{people.length} members.<br />One shared review record.</strong><p>Roles determine who can inspect creative, record decisions and manage this browser-local workspace.</p></section>
        <section className="team-context__roles"><h2>Role Access</h2><dl><div><dt>Owner Access</dt><dd>Workspace, access, and every creative action.</dd></div><div><dt>Editor Access</dt><dd>Review findings, write notes, and build iterations.</dd></div><div><dt>Viewer Access</dt><dd>Inspect creative, evidence, and recorded outcomes.</dd></div></dl></section>
        <section className="team-context__activity"><div><span>Owners</span><strong>{people.filter(person=>person.role === "Owner").length}</strong></div><div><span>Editors</span><strong>{people.filter(person=>person.role === "Editor").length}</strong></div><div><span>Pending Access</span><strong>{invites.length}</strong></div></section>
      </aside></div>
    </>}
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="support-dialog" onCloseAutoFocus={event=>{event.preventDefault();inviteTriggerRef.current?.focus()}}>
          <div className="support-dialog__head"><div><p className="support-eyebrow">Workspace Access</p><DialogTitle>Invite Someone</DialogTitle></div></div>
          <DialogDescription>Add a local invitation record and choose what this person could do. No email will be sent.</DialogDescription>
          <form className="support-dialog-form" noValidate onSubmit={addInvite}>
            <Field ref={emailRef} label="Email Address" type="email" value={email} disabled={readOnly} error={message.startsWith("Enter") || message.startsWith("That") ? message : undefined} onChange={event=>{setEmail(event.target.value);setMessage("")}} />
            <SelectField label="Role" value={role} disabled={readOnly} onChange={event=>setRole(event.target.value)}><option>Viewer</option><option>Editor</option></SelectField>
            <div className="support-actions"><Button variant="primary" ref={inviteActionRef} type="submit" disabled={readOnly}>Add Invitation</Button><DialogClose asChild><Button variant="quiet">Cancel</Button></DialogClose></div>
          </form>
        </DialogContent>
    </Dialog>
    <AlertDialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setPendingRemoval(null)}}>
      <AlertDialogContent onCloseAutoFocus={event=>{event.preventDefault();if(removedRef.current)membersHeadingRef.current?.focus();else removeTriggerRef.current?.focus()}}>
        <AlertDialogTitle>Remove {selected?.name}?</AlertDialogTitle>
        <AlertDialogDescription>This removes their membership from this browser's local workspace. No live account access changes.</AlertDialogDescription>
        <AlertDialogActions><AlertDialogCancel asChild><Button variant="secondary">Keep Member</Button></AlertDialogCancel><Button variant="destructive" disabled={readOnly} onClick={()=>{if(selected && selected.role !== "Owner" && commit({...team,people:people.filter(p=>p.email !== selected.email)})){removedRef.current=true;setPendingRemoval(null)}}}>Remove Member</Button></AlertDialogActions>
      </AlertDialogContent>
    </AlertDialog>
  </Page>
}
