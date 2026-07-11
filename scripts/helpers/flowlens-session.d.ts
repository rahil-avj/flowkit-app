import type { IncomingMessage, ServerResponse } from 'http'

/** Dash-slug used for FlowLens session filenames — also usable anywhere else a short, filesystem-safe label is needed. */
export function toDashSlug(str: string, maxLen?: number): string

/** Shared handler body for the `/__flowlens/save-session` dev-server middleware. */
export function handleSaveSession(
  req: IncomingMessage,
  res: ServerResponse,
  flowLensDir: string,
  bootstrapExtra?: object,
): Promise<void>
