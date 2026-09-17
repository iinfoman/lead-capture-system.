import { Link } from 'react-router-dom'
import EmptyState from '../components/common/EmptyState'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-28">
      <EmptyState
        icon="🧭"
        title="Page not found"
        description="That address does not exist. If you were looking for a business page, check the spelling of the link you were sent."
        action={
          <Link to="/" className="btn btn-primary">
            Back to the start
          </Link>
        }
      />
    </div>
  )
}
