import { useGlobalUi } from '../i18n/globalUi';
import { Languages } from "lucide-react";
import { DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "./ui/dropdown-menu";
import { useI18n } from '../i18n/I18nProvider';
import '../styles/language-switcher.css';
export function LanguageSwitcher({ menu = false }: { menu?: boolean }) {
  const ui = useGlobalUi();
  const { locale, setLocale, t, autoTranslate, setAutoTranslate } = useI18n();
  if (menu) return <DropdownMenuSub>
    <DropdownMenuSubTrigger className="language-menu-trigger"><Languages aria-hidden="true" /><span>{t('language.label')}</span><small>{locale === 'en' ? 'English' : '简体中文'}</small></DropdownMenuSubTrigger>
    <DropdownMenuSubContent className="language-menu-content" aria-label={t('language.label')}>
      <DropdownMenuRadioGroup value={locale} onValueChange={value => setLocale(value === 'zh-CN' ? 'zh-CN' : 'en')}>
        <DropdownMenuRadioItem closeOnClick lang="en" value="en">English</DropdownMenuRadioItem>
        <DropdownMenuRadioItem closeOnClick lang="zh-CN" value="zh-CN">简体中文</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem className="language-auto-translate" checked={autoTranslate} onCheckedChange={setAutoTranslate}>{ui('自动翻译协作内容')}</DropdownMenuCheckboxItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
  return <label className="language-switcher">
    <span>{t('language.label')}</span>
    <select aria-label={t('language.label')} value={locale} onChange={(event) => setLocale(event.target.value === 'zh-CN' ? 'zh-CN' : 'en')}>
      <option lang="en" value="en">English</option>
      <option lang="zh-CN" value="zh-CN">简体中文</option>
    </select>
  </label>;
}
