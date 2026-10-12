import React from 'react';
import { formatDisplayDate, formatDisplayDateTime } from '@/shared/lib/date-time';

/** Reports format dates for people while saved and exported values stay unchanged. */
export function LabDateLabel({ value, fallback = '时间未记录' }: { value?: string | null; fallback?: string }) {
  const label = value ? formatDisplayDateTime(value) ?? formatDisplayDate(value) : null;
  const full = value ? formatDisplayDateTime(value, { year: 'always' }) ?? formatDisplayDate(value, { year: 'always' }) : null;
  return <time dateTime={label && value ? value : undefined} title={full ?? undefined}>{label ?? fallback}</time>;
}
