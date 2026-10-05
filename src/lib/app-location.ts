/** Product paths live at the app hostname root; local previews retain /app. */
export function isAppHost(hostname: string) {
  return hostname.toLowerCase().startsWith("app.")
}

export function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1"
}

/** Cloudflare Pages previews cannot provision an app.* sibling hostname. */
export function isPreviewHost(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized === "pages.dev" || normalized.endsWith(".pages.dev")
}

function currentHostname() {
  return typeof window === "undefined" ? "localhost" : window.location.hostname
}

export function appPath(path: string, hostname = currentHostname()) {
  const normalized = path.replace(/^\/app(?=\/|\?|#|$)/, "") || "/ads"
  const rooted = normalized.startsWith("/") ? normalized : `/${normalized}`
  if (/^\/login(?:[?#]|$)/.test(rooted) && !isPreviewHost(hostname)) return rooted
  return `${isAppHost(hostname) ? "" : "/app"}${rooted}`
}

export function appEntryPath(authenticated: boolean, hostname = currentHostname()) {
  return appPath(authenticated ? "/ads" : "/login", hostname)
}

export function appUrl(path: string, location: Pick<Location, "hostname" | "host" | "protocol"> = window.location) {
  if (isLocalHost(location.hostname) || isAppHost(location.hostname) || isPreviewHost(location.hostname)) return appPath(path, location.hostname)
  return `${location.protocol}//app.${location.host}${appPath(path, `app.${location.hostname}`)}`
}

export function resolveAppLocation(hostname: string, pathname: string, search = "", hash = "") {
  const appHost = isAppHost(hostname)
  const previewHost = isPreviewHost(hostname)
  const legacy = pathname === "/app" || pathname.startsWith("/app/")
  return {
    surface: appHost || ((isLocalHost(hostname) || previewHost) && legacy) ? "app" as const : "public" as const,
    basePath: appHost ? "" : "/app",
    redirectTo: appHost && legacy ? `${appPath(pathname === "/app/" ? "/ads" : pathname, hostname)}${search}${hash}` : null,
  }
}
