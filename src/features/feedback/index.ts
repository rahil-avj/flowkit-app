// Public API for the feedback feature.
// Import from '@flowkit-features/feedback' — never reach inside components/.
export { default as AuthorAvatar } from './components/AuthorAvatar'
export { TEAM_MEMBERS, type TeamMember } from './components/teamMembers'
export type { CommentFilter } from './context'
export { FeedbackTabProvider, useFeedbackTabContext } from './context'
export { useFeedback } from './context/FeedbackContext'
export { default as FeedbackPanel } from './panel'
