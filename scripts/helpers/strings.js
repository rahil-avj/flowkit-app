// Helper: string casing/slug utilities.
export function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function toTitle(screenName) {
  const withoutSuffix = screenName.endsWith('Screen') ? screenName.slice(0, -6) : screenName
  return withoutSuffix.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
}

export function toId(screenName) {
  const title = toTitle(screenName)
  return title.replace(/\s+/g, '-').toLowerCase()
}
