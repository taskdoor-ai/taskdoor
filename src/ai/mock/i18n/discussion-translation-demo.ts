import type { Locale } from '@/shared/i18n/core';

// Small, exact bilingual replies keep custom-task demos usable without pretending to translate arbitrary prose.
const englishReplies: Readonly<Record<string, string>> = {
  yes: '是的',
  no: '不是',
  ok: '好的',
  okay: '好的',
  hello: '你好',
  hi: '你好',
  thanks: '谢谢',
  'thank you': '谢谢',
  'got it': '收到',
  received: '收到',
  understood: '明白',
  agreed: '同意',
  done: '已完成',
  sorry: '抱歉',
  "you're welcome": '不客气',
};
const chineseReplies: Readonly<Record<string, string>> = {
  是的: 'Yes',
  不是: 'No',
  不: 'No',
  好的: 'OK',
  好: 'OK',
  你好: 'Hello',
  谢谢: 'Thank you',
  收到: 'Got it',
  明白: 'Understood',
  同意: 'Agreed',
  已完成: 'Done',
  抱歉: 'Sorry',
  不客气: "You're welcome",
};

export function lookupDiscussionShortReply(locale: Locale, source: string): string | undefined {
  const trimmed = source.trim();
  const punctuation = trimmed.match(/[.!?。！？]+$/)?.[0] ?? '';
  const body = trimmed.slice(0, trimmed.length - punctuation.length).trim().toLowerCase();
  const translated = (locale === 'en' ? chineseReplies : englishReplies)[body];
  if (!translated) return undefined;
  const punctuationMap: Readonly<Record<string, string>> = locale === 'en'
    ? { '。': '.', '！': '!', '？': '?' }
    : { '.': '。', '!': '！', '?': '？' };
  return translated + punctuation.replace(/[.!?。！？]/g, mark => punctuationMap[mark] ?? mark);
}

// Exact supplemental pairs for the current launch and retrospective demo messages.
const discussionSamples: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'product-launch-venue': {
    '场地方的容量确认与当前座席表已收齐，等核对后再发最终邀请名额。': 'The venue capacity confirmation and current seating plan are ready. We will issue the final invitation allocation after reviewing them.',
  },
  'product-launch-run-of-show': {
    '嘉宾衔接表和导播 cue 表均已更新，演示后的问答由主持人接回。': 'The speaker handoff sheet and production cue sheet have both been updated. The host will take over the Q&A after the demo.',
  },
  'product-launch-promo-assets': {
    '邀请函的当前发布文字稿已从设计文件抽出，与活动信息表一起交给内容核对。': 'The current invitation copy has been extracted from the design file and passed to content review together with the event information sheet.',
  },
  'weekly-retro-notes': {
    '决定清单已核对；问题 Q07 的确认人仍有分歧；6 条行动已有草稿，3 条责任与期限已确认。剩余问题核对约 45 分钟、行动确认与修订约 60 分钟。林洁和周岚在 9/15 上午完成核对后合并共享。': 'The decision list has been reviewed. The approver for issue Q07 is still disputed. All 6 actions have drafts, and owners and deadlines have been confirmed for 3. The remaining issue review will take about 45 minutes, and action confirmation and revisions about 60 minutes. 林洁 and 周岚 will merge and share the notes after completing the review on the morning of September 15.',
  },
  'weekly-retro-decisions': {
    '决定清单和原始依据已经逐条核对，D04 的确认台账已统一。我已确认完成。': 'The decision list and source evidence have been checked item by item, and the confirmation register for D04 is consistent. I have confirmed completion.',
    '9/14 12:00 已逐条核对决定和依据，D04 的确认台账与纪要清单已统一，确认完成。': 'At 12:00 on September 14, the decisions and evidence were checked item by item. The confirmation register for D04 and the meeting notes list are now consistent. Completion is confirmed.',
  },
  'weekly-retro-open-issues': {
    '问题清单和影响范围已整理，Q07 的两份记录使用了不同确认人，剩余责任边界与下一次核对时间待确认。剩余核对与修订约 45 分钟；林洁与周岚已约 9/15 10:00 核对 Q07，预计当天完成。': 'The issue list and impact scope are ready. The two Q07 records name different approvers; the remaining responsibility boundaries and next review time still need confirmation. The remaining review and revisions will take about 45 minutes. 林洁 and 周岚 have scheduled a Q07 review for September 15 at 10:00, with completion expected that day.',
    'Q07 的影响范围已收敛到合同附件，责任边界表和跟进清单需要使用同一个确认人。': 'The impact of Q07 has been narrowed to the contract attachments. The responsibility boundary table and follow-up list need to name the same approver.',
  },
  'weekly-retro-actions': {
    '行动项草稿已成形；3 条责任和期限已确认，另 3 条仍待回复，A03 的两份记录日期不一致。剩余确认与修订约 60 分钟；相关成员将在 9/15 上午回复，周岚随后合并纪要。': 'The action drafts are ready. Owners and deadlines are confirmed for 3 actions; 3 others are awaiting replies, and the two A03 records show different dates. The remaining confirmation and revisions will take about 60 minutes. The members concerned will reply on the morning of September 15, after which 周岚 will merge the meeting notes.',
    '封面行动项的承诺表和执行排期已补齐，源文件与裁切图作为同一份交付核对。': 'The commitment sheet and execution schedule for the cover action item are complete. The source file and cropped image will be reviewed as one deliverable.',
  },
  'ccx-serum-launch': {
    '【附件样例·视觉素材】这组 JPG、PNG、WebP 和 SVG 仅用于查看本地讨论附件的展示与预览效果，不代表业务审核结论。': '[Attachment example: visual assets] These JPG, PNG, WebP, and SVG files are only for checking how local discussion attachments are displayed and previewed. They do not represent business review conclusions.',
    '【附件样例·执行资料】这里复用首发 PDF、PPTX 和 HTML 原件，可从讨论直接打开核对内容；均为本地演示资料。': '[Attachment example: execution materials] These original launch PDF, PPTX, and HTML files can be opened directly from the discussion for review. All are local demo materials.',
    '【附件样例·交接配置】TXT、Markdown、JSON 和 XML 用于对照文字阅读与配置文件预览，不会执行配置或修改业务数据。': '[Attachment example: handoff configuration] TXT, Markdown, JSON, and XML files demonstrate text reading and configuration previews. They do not execute configurations or change business data.',
    '【附件样例·引用回复】这条示例回复继续引用同一份协作说明，不新增文件副本，便于查看回复关系与附件复用。': '[Attachment example: reply reference] This example reply references the same collaboration notes without adding a file copy, so you can check the reply relationship and attachment reuse.',
    '【附件样例·音视频】MP3 首发简报和 MP4 总览用于体验播放、进度、音量与视频全屏；均为本地演示资料，点击后手动播放。': '[Attachment example: audio and video] The MP3 launch briefing and MP4 overview demonstrate playback, seeking, volume, and fullscreen video. All are local demo materials and must be played manually after opening.',
  },
};

export function lookupDiscussionSampleTranslation(locale: Locale, taskId: string, source: string): string | undefined {
  const pairs = discussionSamples[taskId];
  if (locale === 'en') return pairs?.[source];
  return Object.entries(pairs ?? {}).find(([, translated]) => translated === source)?.[0];
}
