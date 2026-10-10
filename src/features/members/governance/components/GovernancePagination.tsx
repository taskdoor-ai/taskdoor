import { Button } from '@/shared/ui/button'
import { useCatalog } from '@/shared/i18n/catalog'
import { governanceMessages } from '@/features/members/governance/i18n/governance-messages'

export const GOVERNANCE_PAGE_SIZE = 10

export function GovernancePagination({ label, page, total, onChange }: { label: string; page: number; total: number; onChange: (page: number) => void }) {
  const t = useCatalog(governanceMessages)
  return <nav aria-label={label} className="governance-pagination">
    <span role="status" aria-live="polite">{t('governance.page', { page: String(page), total: String(total) })}</span>
    <div>
      <Button disabled={page === 1} onClick={() => onChange(page - 1)} size="sm" variant="outline">{t('governance.previous')}</Button>
      <Button disabled={page === total} onClick={() => onChange(page + 1)} size="sm" variant="outline">{t('governance.next')}</Button>
    </div>
  </nav>
}
