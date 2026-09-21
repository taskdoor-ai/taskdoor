import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Check, Loader2, Undo2 } from 'lucide-react';
import { useGlobalUi } from '../i18n/globalUi';
import { useProgressCopy } from '../i18n/progressCopy';
import { toast } from './ui/toast';
import { criterionStage, type CriterionReview } from '../lib/taskCriterionReview';

const stages = ['未形成结果', '少量完成', '部分完成', '大部分完成', '接近完成'];
export function TaskCriterionIndicator({ index, review, onConfirm }: { index: number; review?: CriterionReview; onConfirm?: (confirmed: boolean) => void | Promise<void> }) {
  const ui = useGlobalUi();
  const p = useProgressCopy();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const saving = useRef(false);
  const stage = criterionStage(review);
  const confirmation = review?.confirmation;
  const wasConfirmed = useRef(Boolean(confirmation));
  const tipId = useId();
  useEffect(() => {
    const justConfirmed = !wasConfirmed.current && Boolean(confirmation);
    wasConfirmed.current = Boolean(confirmation);
    if (!justConfirmed) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 420);
    return () => clearTimeout(timer);
  }, [Boolean(confirmation)]);
  const aiLabel = stage === null ? ui('AI 暂无评估') : `AI · ${p(stages[stage])}`;
  const assessmentHint = stage === null ? ui('AI 暂无评估') : ui('AI 分析：{stage}', { stage: p(stages[stage]) });
  const actionLabel = confirmation ? ui('撤销确认') : ui('确认达成');
  const toggleConfirmation = async () => {
    if (!onConfirm || saving.current) return;
    saving.current = true; setPending(true); setError('');
    try {
      await onConfirm(!confirmation);
      toast.success(confirmation ? ui('已撤销确认') : ui('已人工确认'));
    }
    catch { setError(ui('确认未保存，请重试；若标准已变化，请先重新加载。')); }
    finally { saving.current = false; setPending(false); }
  };
  return <>
    <span className="criterion-orbit-wrap">
      <button type="button" className="criterion-orbit" data-confirmed={Boolean(confirmation)} data-celebrating={celebrating} disabled={!onConfirm || pending} aria-label={`${index + 1}. ${onConfirm ? actionLabel : confirmation ? ui('已人工确认') : aiLabel}`} aria-pressed={Boolean(confirmation)} aria-describedby={tipId} onClick={() => void toggleConfirmation()}>
        <svg viewBox="0 0 28 28" aria-hidden="true">{[0,1,2,3].map(segment => <circle key={segment} cx="14" cy="14" r="11.5" pathLength="100" strokeDasharray="20 80" strokeDashoffset={-segment * 25} className="criterion-orbit-segment" data-filled={segment < (stage ?? 0)} style={{'--segment-delay':`${segment * 35}ms`} as CSSProperties} />)}</svg>
        <span className="criterion-orbit-center">{pending ? <Loader2 size={13} className="criterion-saving" /> : confirmation ? <Check size={13} strokeWidth={2.4} /> : index + 1}</span>
        {!pending && onConfirm && <span className="criterion-orbit-hover" aria-hidden="true">{confirmation ? <Undo2 size={13} /> : <Check size={13} strokeWidth={2.4} />}</span>}
      </button>
      <span className="criterion-orbit-tip" id={tipId} role="tooltip"><strong>{assessmentHint}</strong>{confirmation ? <span>{onConfirm ? ui('已人工确认 · 点击撤销') : ui('已人工确认')}</span> : onConfirm && <span>{ui('点击人工确认达成')}</span>}</span>
    </span>
    <div className="criterion-assessment">
      {onConfirm && <button type="button" className="criterion-touch-confirm" disabled={pending} onClick={() => void toggleConfirmation()}>{pending ? <Loader2 size={12} className="criterion-saving" /> : confirmation ? <Undo2 size={12} /> : <Check size={12} />}{actionLabel}</button>}
      {error && <span className="task-criteria-error" role="alert">{error}</span>}
    </div>
  </>;
}
