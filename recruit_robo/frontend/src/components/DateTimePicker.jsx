import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'

/**
 * Wraps <input type="datetime-local"> with a pending/draft state.
 * The value is only committed to the parent via onChange when the user
 * clicks OK. A Clear button resets everything.
 *
 * Props mirror a standard input:
 *   value      — controlled value from parent
 *   onChange   — called with a synthetic event { target: { value } } on OK
 *   className  — forwarded to the input element
 */
export default function DateTimePicker({ value, onChange, className = '' }) {
  const [draft,   setDraft]   = useState(value || '')
  const [pending, setPending] = useState(false)   // true = user has changed but not yet OK'd

  // Sync when parent resets or pre-populates the value
  useEffect(() => {
    setDraft(value || '')
    setPending(false)
  }, [value])

  function handleChange(e) {
    setDraft(e.target.value)
    setPending(e.target.value !== (value || ''))
  }

  function handleOk() {
    onChange({ target: { value: draft } })
    setPending(false)
  }

  function handleClear() {
    setDraft('')
    onChange({ target: { value: '' } })
    setPending(false)
  }

  // Format committed value for display label
  function fmtLabel(iso) {
    if (!iso) return null
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch { return iso }
  }

  const committed = value || ''

  return (
    <div className="space-y-2">
      <input
        type="datetime-local"
        value={draft}
        onChange={handleChange}
        className={className}
      />

      {/* Confirmed label — shows the locked-in value when not in pending state */}
      {committed && !pending && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-lg">
          <Check className="w-3 h-3 text-purple-500 flex-shrink-0" />
          <span className="text-[11px] text-purple-700 font-medium flex-1 truncate">{fmtLabel(committed)}</span>
          <button type="button" onClick={handleClear}
            className="text-purple-300 hover:text-red-400 transition-colors flex-shrink-0" title="Clear">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* OK / Cancel strip — only visible while a change is pending */}
      {pending && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOk}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #49029F, #7c3aed)' }}>
            <Check className="w-3 h-3" /> OK
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(committed)
              setPending(false)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      )}
    </div>
  )
}
