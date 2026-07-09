import fs from 'fs'

/**
 * Read and parse a JSON file. Returns `fallback` (default: null) on any error.
 * Use for files that may legitimately be absent.
 */
export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

/** Serialize `data` to a JSON file with 2-space indentation and a trailing newline. */
export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
}
