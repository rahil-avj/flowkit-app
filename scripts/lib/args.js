/** Parse a single CLI flag string (e.g. `-foo:bar` → `{ cmd: 'foo', val: 'bar' }`). */
export function parseArg(flag) {
  if (!flag || !flag.startsWith('-')) return null
  const colon = flag.indexOf(':')
  if (colon === -1) return { cmd: flag.slice(1), val: '' }
  return { cmd: flag.slice(1, colon), val: flag.slice(colon + 1) }
}

/** Find `--name:value` in an args array and return the value (strips surrounding quotes). */
export function parseStringFlag(args, name) {
  const prefix = `--${name}:`
  const raw = args.find(a => a.startsWith(prefix)) ?? ''
  return raw.slice(prefix.length).replace(/^["']|["']$/g, '')
}
