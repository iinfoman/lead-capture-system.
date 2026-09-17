export default function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <div className="mb-2 text-2xl" aria-hidden="true">
        ⚠️
      </div>
      <h2 className="text-base font-semibold text-red-900">{title}</h2>
      {description ? <p className="mt-1.5 text-sm text-red-700">{description}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          Try again
        </button>
      ) : null}
    </div>
  )
}
