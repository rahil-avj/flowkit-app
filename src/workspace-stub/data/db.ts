// Stub — satisfies @workspace/data/db type resolution when no workspace is active.
const db = {}
export default db
export type WorkspaceDb = typeof db
