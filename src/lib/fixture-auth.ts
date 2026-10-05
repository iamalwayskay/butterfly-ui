import { useEffect, useState, useSyncExternalStore } from "react"

const key = "butterfly-fixture-authenticated"
const eventName = "butterfly-fixture-auth-changed"
export function readFixtureAuth() {
  try { return localStorage.getItem(key) === "true" } catch { return false }
}
export function signInFixture() {
  try {
    localStorage.setItem(key, "true")
    window.dispatchEvent(new Event(eventName))
    return true
  } catch { return false }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(eventName, onChange)
  return () => { window.removeEventListener("storage", onChange); window.removeEventListener(eventName, onChange) }
}
export function signOutFixtureSession() {
  try {
    localStorage.removeItem(key)
    window.dispatchEvent(new Event(eventName))
    return true
  } catch { return false }
}
export function useFixtureAuth() {
  const authenticated = useSyncExternalStore(subscribe, readFixtureAuth, () => false)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setChecked(true), 450)
    return () => window.clearTimeout(timer)
  }, [])
  return authenticated && !checked ? null : authenticated
}
