import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { dayFromToday, MAX_TOKEN_DAYS } from '@/features/credentials/lib/pat'
import { tokenMessages } from '@/features/credentials/i18n/token-messages'
import { useCatalog } from '@/shared/i18n/catalog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Button } from '@/shared/ui/button'

const localDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year!, month! - 1, day!)
}
const dateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function TokenExpiryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (day: string) => void
}) {
  const { locale } = useI18n()
  const t = useCatalog(tokenMessages)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const [focusDate, setFocusDate] = useState<string | null>(null)
  const [month, setMonth] = useState(
    () => new Date(localDate(value).getFullYear(), localDate(value).getMonth(), 1),
  )
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  const days = Array.from(
    { length: 42 },
    (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index),
  )
  const min = dayFromToday(0)
  const max = dayFromToday(MAX_TOKEN_DAYS)
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    month,
  )
  useEffect(() => {
    if (!focusDate || !calendarOpen) return
    calendarRef.current
      ?.querySelector<HTMLButtonElement>(`button[aria-label="${focusDate}"]`)
      ?.focus()
    setFocusDate(null)
  }, [focusDate, calendarOpen, month])
  const moveFocus = (date: string, key: string) => {
    const delta =
      key === 'ArrowRight'
        ? 1
        : key === 'ArrowLeft'
          ? -1
          : key === 'ArrowDown'
            ? 7
            : key === 'ArrowUp'
              ? -7
              : 0
    if (!delta) return false
    const next = localDate(date)
    next.setDate(next.getDate() + delta)
    const nextValue = dateValue(next)
    if (nextValue < min || nextValue > max) return true
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1))
    setFocusDate(nextValue)
    return true
  }
  return (
    <div className="token-expiry-picker">
      <div className="token-expiry-presets">
        {[30, 90, 365].map((days) => (
          <Button
            key={days}
            type="button"
            size="sm"
            variant={value === dayFromToday(days) ? 'secondary' : 'outline'}
            aria-pressed={value === dayFromToday(days)}
            onClick={() => {
              onChange(dayFromToday(days))
              setCalendarOpen(false)
            }}
          >
            {t('tokens.days', { days })}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={calendarOpen ? 'secondary' : 'outline'}
          aria-expanded={calendarOpen}
          aria-controls="token-expiry-calendar"
          onClick={() => {
            setMonth(new Date(localDate(value).getFullYear(), localDate(value).getMonth(), 1))
            setCalendarOpen((open) => !open)
          }}
        >
          <CalendarDays aria-hidden="true" />
          {t('tokens.customDate')}
        </Button>
      </div>
      <span className="token-expiry-value">
        {t('tokens.expiresOn', {
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(localDate(value)),
        })}
      </span>
      {calendarOpen && (
        <div
          className="token-expiry-calendar"
          id="token-expiry-calendar"
          ref={calendarRef}
          role="group"
          aria-label={t('tokens.calendar')}
        >
          <div className="token-expiry-calendar-heading">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('tokens.previousMonth')}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <strong>{monthLabel}</strong>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('tokens.nextMonth')}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="token-expiry-calendar-grid">
            {Array.from({ length: 7 }, (_, index) => (
              <span key={index} aria-hidden="true">
                {new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(
                  new Date(2026, 8, 27 + index),
                )}
              </span>
            ))}
            {days.map((day) => {
              const date = dateValue(day)
              return (
                <button
                  key={date}
                  type="button"
                  disabled={date < min || date > max}
                  aria-label={date}
                  aria-pressed={date === value}
                  className={day.getMonth() !== month.getMonth() ? 'outside' : ''}
                  onKeyDown={(event) => {
                    if (moveFocus(date, event.key)) event.preventDefault()
                  }}
                  onClick={() => {
                    onChange(date)
                    setCalendarOpen(false)
                  }}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
