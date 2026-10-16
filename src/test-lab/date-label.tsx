import React from 'react';
import { formatDisplayDate, formatDisplayDateTime } from '@/shared/lib/date-time';

/** Reports format dates for people while saved and exported values stay unchanged. */
export function LabDateLabel({ value, fallback = '时间未记录', locale = 'zh-CN' }: { value?: string | null; fallback?: string; locale?: string }) {
  const label = value ? formatDisplayDateTime(value, { locale }) ?? formatDisplayDate(value, { locale }) : null;
  const full = value ? formatDisplayDateTime(value, { locale, year: 'always' }) ?? formatDisplayDate(value, { locale, year: 'always' }) : null;
  return <time dateTime={label && value ? value : undefined} title={full ?? undefined}>{label ?? fallback}</time>;
}
