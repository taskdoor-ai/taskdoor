import type { Locale } from '@/shared/i18n/core';
import type { AiTransferResult } from '@/features/ai-connection/components/AiConnectionDialog';
export function aiTransferMessage(locale: Locale, result: AiTransferResult, tool: string) {
  if (locale !== 'en') return result.message;
  if (result.handoffFile) {
    const ready = `Local file prepared: ${result.handoffFile.path}.`;
    if (result.status === 'copy-failed') return `${ready} Copying the file-path prompt failed; the tool was not opened. Allow clipboard access and retry.`;
    if (result.status === 'open-failed') return `${ready} The file-path prompt was copied, but ${tool} could not be opened. Open the client manually and paste the prompt or attach the HTML file.`;
    if (result.status === 'open-attempted') return `${ready} The file-path prompt was copied and an attempt was made to open ${tool}. File reading cannot be confirmed. ${tool === 'WorkBuddy' ? 'Paste the prompt in WorkBuddy or attach the HTML file manually.' : 'Paste the prompt if needed, or attach the HTML file manually if the client cannot access the path.'}`;
  }
  switch (result.status) {
    case 'preview': return `Preview: open this context in ${tool}. Nothing was copied or launched.`;
    case 'cancelled': return 'Cancelled. No attempt was made to open the tool.';
    case 'file-failed': return 'The local file could not be prepared. Nothing was copied or opened; your annotations are retained. Check that the local server is running and retry.';
    case 'copy-failed': return 'Copy failed; the tool was not opened. Allow clipboard access and try again.';
    case 'open-failed': return `Context copied, but the browser could not open ${tool}. Open the tool manually and paste, or try again.`;
    case 'open-attempted': return `Context copied and an attempt was made to open ${tool}. Client startup or task acceptance cannot be confirmed. Paste the context into the tool if needed.`;
  }
}
