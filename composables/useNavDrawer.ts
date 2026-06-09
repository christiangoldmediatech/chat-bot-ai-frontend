/**
 * Shared open/close state for the mobile nav drawer. Header opens it, sidebar
 * reads it, route changes close it. `useState` keeps it reactive across all
 * components without prop drilling.
 */
export function useNavDrawer() {
  const open = useState<boolean>('cbai.navDrawer', () => false)

  function toggle(): void {
    open.value = !open.value
  }

  function close(): void {
    open.value = false
  }

  return { open, toggle, close }
}
