import { JSONBIN_CONFIG } from './constants'

// Only scoped Access Keys are accepted. JSONBin master keys grant full account
// access (not just the bins created with them) — accepting one here would mean
// a single leaked key compromises the whole account, not just this app's data.
function assertNotMasterKey(key: string): void {
  if (key.startsWith('$2a$')) {
    throw new Error(
      'Master keys are not supported — use a scoped Access Key from your JSONBin dashboard instead.'
    )
  }
}

export async function pushToJsonBin(
  filename: string,
  content: string,
  accessKey: string
): Promise<string> {
  assertNotMasterKey(accessKey)
  const res = await fetch('https://api.jsonbin.io/v3/b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Key': accessKey,
      'X-Bin-Name': filename,
      ...(JSONBIN_CONFIG.collectionName
        ? { 'X-Collection-Name': JSONBIN_CONFIG.collectionName }
        : {}),
    },
    body: content,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `JSONBin error ${res.status}`)
  }
  const data = await res.json()
  const binId = data.metadata?.id as string
  return `https://api.jsonbin.io/v3/b/${binId}/latest`
}

export async function fetchFromJsonBin(binUrl: string, accessKey: string): Promise<string> {
  assertNotMasterKey(accessKey)
  const match = binUrl.match(/\/b\/([a-f0-9]+)/i)
  if (!match) throw new Error('Invalid bin URL. Paste the full JSONBin link.')
  const binId = match[1]
  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Access-Key': accessKey },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `JSONBin error ${res.status}`)
  }
  const wrapper = await res.json()
  return JSON.stringify(wrapper.record ?? wrapper)
}
