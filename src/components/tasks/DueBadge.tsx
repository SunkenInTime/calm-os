import type { DueLabel } from '../../lib/date'

const BADGE_STYLES: Record<DueLabel, string> = {
  'Overdue': 'bg-amber-50 text-amber-700 border-amber-200',
  'Due today': 'bg-slate-100 text-slate-700 border-slate-200',
  'Due tomorrow': 'bg-slate-100 text-slate-600 border-slate-200/80',
  'Due in 2 days': 'bg-slate-50 text-slate-500 border-slate-200/60',
  'No date': 'bg-slate-50 text-slate-400 border-slate-100',
}

type DueBadgeProps = {
  label: DueLabel
  hide?: DueLabel[]
}

function DueBadge({ label, hide = ['No date'] }: DueBadgeProps) {
  if (hide.includes(label)) return null

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-none ${BADGE_STYLES[label]}`}
    >
      {label}
    </span>
  )
}

export default DueBadge
