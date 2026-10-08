import { useMockText } from '@/i18n/MockDataProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { progressText } from '@/shared/i18n/progress-copy';

export function useProgressCopy() {
  const { locale } = useI18n();
  const mock = useMockText();
  return (value: string) => progressText(locale, value, 0, mock.text);
}
