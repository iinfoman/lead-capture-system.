export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 text-3xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
