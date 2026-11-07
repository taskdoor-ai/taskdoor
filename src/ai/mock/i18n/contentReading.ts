import type { Locale } from '@/shared/i18n/core';
import { lookupDiscussionShortReply } from '@/ai/mock/i18n/discussion-translation-demo';

export const AUTO_TRANSLATE_KEY = 'taskdoor.content-auto-translate.v1';
export function needsContentTranslation(source: string, locale: Locale) {
  // Compare readable prose, not Markdown destinations, URLs or code identifiers.
  const visibleText = source
    .replace(/```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/!?\[([^\]]*)\]\((?:<[^>\r\n]+>|[^)\r\n]+)\)/g, '$1')
    .replace(/<https?:\/\/[^>]+>|https?:\/\/\S+/g, '')
    .replace(/<[^>\r\n]+>/g, '');
  const hasChinese = /[\u3400-\u9fff]/u.test(visibleText);
  return locale === 'en' ? hasChinese : !hasChinese && (/[A-Za-z]{3,}/.test(visibleText) || lookupDiscussionShortReply('zh-CN', visibleText) !== undefined);
}
export function contentReading(source: string, candidate: string, locale: Locale, enabled: boolean, original: boolean) {
  const translated = candidate !== source;
  const needsTranslation = needsContentTranslation(source, locale);
  return {
    text: enabled && !original && translated ? candidate : source,
    state: !enabled ? 'off' : translated ? (original ? 'original' : 'translated') : needsTranslation ? 'unavailable' : 'same',
  } as const;
}
