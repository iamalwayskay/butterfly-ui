import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Boxes, ListChecks, Plus, Settings, Users, ChevronsUpDown, Database, Upload, PanelLeftClose, PanelLeftOpen, UserRound, CircleHelp, LogOut, Search, LayoutDashboard, type LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { appPath } from "@/lib/app-location"
import { signOutFixtureSession } from "@/lib/fixture-auth"
import "@/components/app-shell.css"

const primary = [
  { title: "My Ads", href: "/app/ads", icon: Boxes },
  { title: "Add Ads", href: "/app/add", icon: Upload },
  { title: "Create Ads", href: "/app/create", icon: Plus },
  { title: "Creative Canvas", href: "/app/canvas", icon: LayoutDashboard },
  { title: "Work Queue", href: "/app/work", icon: ListChecks },
]

const account = [
  { title: "Team", href: "/app/team", icon: Users },
  { title: "Settings", href: "/app/settings", icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const drawerOrigin = useRef(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("butterfly-sidebar-open") !== "false")
  const [workspaceName, setWorkspaceName] = useState(() => localStorage.getItem("butterfly-workspace-name") || "Kindred")

  useEffect(() => {
    const updateName = () => setWorkspaceName(localStorage.getItem("butterfly-workspace-name") || "Kindred")
    window.addEventListener("storage", updateName)
    window.addEventListener("butterfly-workspace-updated", updateName)
    return () => { window.removeEventListener("storage", updateName); window.removeEventListener("butterfly-workspace-updated", updateName) }
  }, [])

  const updateSidebarOpen = (open: boolean) => {
    setSidebarOpen(open)
    localStorage.setItem("butterfly-sidebar-open", String(open))
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={updateSidebarOpen} className="butterfly-workspace" style={{ "--sidebar-width": "var(--nav-expanded-width)", "--sidebar-width-icon": "var(--nav-rail-width)" } as CSSProperties}>
      <CloseMobileOnRoute pathname={pathname} />
      <a href="#workspace-main" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-lg focus:translate-y-0">Skip to content</a>
      <Sidebar collapsible="icon" className="butterfly-sidebar" onMobileCloseAutoFocus={event=>{event.preventDefault();if(drawerOrigin.current !== window.location.pathname)document.getElementById("workspace-main")?.focus();else mobileTrigger.current?.focus()}}>
        <SidebarHeader className="butterfly-sidebar-header">
          <CloseOnNavigateLink to="/app/ads" className="butterfly-brand-link" aria-label="Butterfly — My Ads">
            <ButterflyMark className="butterfly-brand-mark" />
            <span className="butterfly-collapse-hide butterfly-wordmark">butterfly</span>
          </CloseOnNavigateLink>
          <WorkspaceMenu workspaceName={workspaceName} />
        </SidebarHeader>
        <SidebarContent className="butterfly-sidebar-content">
          <SidebarGroup className="butterfly-nav-group" aria-label="Workspace navigation">
            <SidebarGroupLabel className="butterfly-nav-group-label">Main</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="butterfly-nav-list">
                {primary.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarDestination item={item} active={pathname === appPath(item.href) || (item.href === "/app/ads" && pathname.startsWith(`${appPath(item.href)}/`))} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="butterfly-nav-group" aria-label="Account navigation">
            <SidebarGroupLabel className="butterfly-nav-group-label">Account</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="butterfly-nav-list">
                {account.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarDestination item={item} active={pathname === appPath(item.href)} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="butterfly-sidebar-footer">
          <span className="butterfly-collapse-hide butterfly-workspace-caption">{workspaceName} workspace</span>
          <UserMenu onSignOut={() => { if (signOutFixtureSession()) navigate(appPath("/login")) }} />
          <SidebarCollapseControl />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset id="workspace-main" tabIndex={-1} className="min-w-0">
        <header className="butterfly-mobile-bar"><SidebarTrigger ref={mobileTrigger} onClick={()=>{drawerOrigin.current=pathname}} aria-label="Open navigation" /><ButterflyMark className="size-[22px]" /><span className="butterfly-mobile-title">{pageTitle(pathname)}</span></header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function SidebarDestination({ item, active }: { item: { title: string; href: string; icon: LucideIcon }; active: boolean }) {
  const { setOpenMobile, state, isMobile } = useSidebar()
  const expressive = item.href === "/app/create"
  return <SidebarMenuButton asChild isActive={active} tooltip={item.title} className={`butterfly-nav-item${expressive ? " butterfly-nav-item--expressive" : ""} group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:p-0!`}><Link to={appPath(item.href)} aria-current={active ? "page" : undefined} aria-label={!isMobile && state === "collapsed" ? item.title : undefined} onClick={() => setOpenMobile(false)}><item.icon /><span>{item.title}</span></Link></SidebarMenuButton>
}

function WorkspaceMenu({ workspaceName }: { workspaceName: string }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const [query, setQuery] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const collapsed = state === "collapsed" && !isMobile
  const matches = workspaceName.toLowerCase().includes(query.trim().toLowerCase()) || "sample account".includes(query.trim().toLowerCase())
  const trigger = (
    <DropdownMenuTrigger asChild>
      <button ref={triggerRef} type="button" className="butterfly-account-trigger" aria-label="Switch account or manage sources">
        <span className="butterfly-account-tile" aria-hidden>{workspaceName.slice(0,1).toUpperCase()}</span>
        <span className="butterfly-collapse-hide butterfly-account-copy"><span>{workspaceName}</span><small>Sample account</small></span>
        <ChevronsUpDown className="butterfly-collapse-hide butterfly-account-chevron" aria-hidden />
      </button>
    </DropdownMenuTrigger>
  )
  return (
    <DropdownMenu>
      {collapsed ? <Tooltip><TooltipTrigger asChild>{trigger}</TooltipTrigger><TooltipContent side="right">{workspaceName} — Sample account</TooltipContent></Tooltip> : trigger}
      <DropdownMenuContent align="start" sideOffset={8} className="butterfly-account-menu" onCloseAutoFocus={event=>{event.preventDefault();setQuery("");triggerRef.current?.focus()}}>
        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
        <div className="butterfly-workspace-search"><Search aria-hidden /><input name="workspace-search" autoComplete="off" spellCheck={false} value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key!=="Escape")event.stopPropagation()}} aria-label="Search workspaces" placeholder="Search by workspace name…" /></div>
        {matches ? <DropdownMenuCheckboxItem checked onSelect={event=>event.preventDefault()} className="butterfly-account-current"><span className="butterfly-account-tile" aria-hidden>{workspaceName.slice(0,1).toUpperCase()}</span><span><span className="block font-medium">{workspaceName}</span><span className="block text-xs text-muted-foreground">Sample account</span></span></DropdownMenuCheckboxItem> : <p className="butterfly-workspace-empty">No workspaces found</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><CloseOnNavigateLink to="/app/settings?tab=sources" onClick={()=>setOpenMobile(false)}><Database />Manage Sources</CloseOnNavigateLink></DropdownMenuItem>
        <DropdownMenuItem asChild><CloseOnNavigateLink to="/app/settings?tab=workspace" onClick={()=>setOpenMobile(false)}><Settings />Workspace Settings</CloseOnNavigateLink></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const trigger = <DropdownMenuTrigger asChild><button type="button" className="butterfly-user-trigger" aria-label="Open user menu"><span className="butterfly-user-avatar" aria-hidden>D</span><span className="butterfly-collapse-hide butterfly-user-copy"><span>Demo Owner</span><small>Demo user</small></span><ChevronsUpDown className="butterfly-collapse-hide butterfly-user-chevron" aria-hidden /></button></DropdownMenuTrigger>
  return <DropdownMenu>
    {collapsed ? <Tooltip><TooltipTrigger asChild>{trigger}</TooltipTrigger><TooltipContent side="right">Demo Owner — Demo user</TooltipContent></Tooltip> : trigger}
    <DropdownMenuContent align="start" sideOffset={8} className="butterfly-user-menu">
      <DropdownMenuLabel>Demo Owner</DropdownMenuLabel>
      <DropdownMenuItem asChild><CloseOnNavigateLink to="/app/settings?tab=profile" onClick={()=>setOpenMobile(false)}><UserRound />Profile</CloseOnNavigateLink></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="mailto:support@butterfly.local"><CircleHelp />Help</a></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={()=>{setOpenMobile(false);onSignOut()}}><LogOut />Sign Out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

function pageTitle(pathname: string) {
  const path = pathname.replace(/^\/app(?=\/|$)/, "")
  if (path.startsWith("/ads/")) return "Ad Detail"
  if (path.startsWith("/ads")) return "My Ads"
  if (path.startsWith("/add")) return "Add Ads"
  if (path.startsWith("/create")) return "Create Ads"
  if (path.startsWith("/canvas")) return "Creative Canvas"
  if (path.startsWith("/work")) return "Work Queue"
  if (path.startsWith("/team")) return "Team"
  if (path.startsWith("/settings")) return "Settings"
  return "Butterfly"
}

function CloseMobileOnRoute({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar()
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile])
  return null
}

function CloseOnNavigateLink({ onClick, to, ...props }: ComponentProps<typeof Link>) {
  const { setOpenMobile } = useSidebar()
  return <Link {...props} to={typeof to === "string" ? appPath(to) : to} onClick={(event) => { setOpenMobile(false); onClick?.(event) }} />
}

function SidebarCollapseControl() {
  const { state, toggleSidebar, isMobile } = useSidebar()
  const collapsed = state === "collapsed"
  const control = <button type="button" onClick={toggleSidebar} aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"} className="butterfly-collapse-control">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span className="butterfly-collapse-hide">Collapse Sidebar</span></button>
  return collapsed && !isMobile ? <Tooltip><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent side="right">Expand Sidebar</TooltipContent></Tooltip> : control
}

export function ButterflyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M11.2 11.7C9.8 7.4 7 5.2 4.8 5.9c-2.2.7-2.5 3.8-.7 5.7 1.5 1.6 4 1.8 7.1 1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.8 11.7c1.4-4.3 4.2-6.5 6.4-5.8 2.2.7 2.5 3.8.7 5.7-1.5 1.6-4 1.8-7.1 1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.8 13.4c-2.3.1-4 1.1-4.1 2.6-.1 1.5 1.6 2.3 3.2 1.6 1.1-.5 1.7-1.7 1.7-3.6M13.2 13.4c2.3.1 4 1.1 4.1 2.6.1 1.5-1.6 2.3-3.2 1.6-1.1-.5-1.7-1.7-1.7-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10.4v7.4M11.8 10.4 10 8.8M12.2 10.4 14 8.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
