// Workspace mock database — all runtime state lives here.
// Named exports are loaded into the platform db object on startup.
// Reset via the simulator's "Reset Database" button.

export const user = {
  id: 'usr_001',
  name: 'Demo User',
  email: 'demo@example.com',
  plan: 'Free',
}

export const items = [
  { id: 1, title: 'First Item', desc: 'A sample item to demonstrate db reads.', status: 'active' },
  { id: 2, title: 'Second Item', desc: 'Another item showing list rendering.', status: 'pending' },
  { id: 3, title: 'Third Item', desc: 'More items can be added in db.ts.', status: 'active' },
]
