import { useGlobalUi } from '@/shared/i18n/global-ui';
import { Languages, Globe2, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/shared/ui/dropdown-menu";
import { useI18n } from '@/shared/i18n/I18nProvider';
import '@/shared/styles/language-switcher.css';
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
      <DropdownMenuCheckboxItem className="language-auto-translate" checked={autoTranslate} onCheckedChange={setAutoTranslate}>{ui('自动翻译讨论内容')}</DropdownMenuCheckboxItem>
    </DropdownMenuSubContent>
  </DropdownMenuSub>;
  return <DropdownMenu>
    <DropdownMenuTrigger className="language-switcher" aria-label={`${t('language.label')}: ${locale === 'en' ? 'English' : '简体中文'}`}>
      <Globe2 aria-hidden="true" size={16} /><span>{locale === 'en' ? 'English' : '简体中文'}</span><ChevronDown aria-hidden="true" size={13} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={6} className="language-switcher-menu" aria-label={t('language.label')}>
      <DropdownMenuRadioGroup value={locale} onValueChange={value => setLocale(value === 'zh-CN' ? 'zh-CN' : 'en')}>
        <DropdownMenuRadioItem closeOnClick lang="en" value="en">English</DropdownMenuRadioItem>
        <DropdownMenuRadioItem closeOnClick lang="zh-CN" value="zh-CN">简体中文</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
