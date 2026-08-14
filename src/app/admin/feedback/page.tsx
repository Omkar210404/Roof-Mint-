import { getFeedback } from './actions'
import { FeedbackClientWrapper } from './feedback-client'

export default async function AdminFeedbackPage() {
  const feedback = await getFeedback()
  return <FeedbackClientWrapper initialFeedback={feedback} />
}
