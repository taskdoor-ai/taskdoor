import type { Locale } from './core';
import type { AiTransferResult } from '../components/AiConnectionDialog';
export function aiTransferMessage(locale: Locale, result: AiTransferResult, tool: string) {
  if (locale !== 'en') return result.message;
  switch (result.status) {
    case 'preview': return `Preview: open this context in ${tool}. Nothing was copied or launched.`;
    case 'cancelled': return 'Cancelled. No attempt was made to open the tool.';
    case 'copy-failed': return 'Copy failed; the tool was not opened. Allow clipboard access and try again.';
    case 'open-failed': return `Context copied, but the browser could not open ${tool}. Open the tool manually and paste, or try again.`;
    case 'open-attempted': return `Context copied and an attempt was made to open ${tool}. Client startup or task acceptance cannot be confirmed. Paste the context into the tool if needed.`;
  }
}
