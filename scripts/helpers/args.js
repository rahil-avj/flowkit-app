/** Find `--name:value` in an args array and return the value (strips surrounding quotes). */
export function parseStringFlag(args, name) {
  const prefix = `--${name}:`
  const raw = args.find(a => a.startsWith(prefix)) ?? ''
  return raw.slice(prefix.length).replace(/^["']|["']$/g, '')
}
