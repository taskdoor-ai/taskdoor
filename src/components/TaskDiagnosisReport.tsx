import { AlertTriangle, GitCompareArrows, LoaderCircle, RefreshCw, Stethoscope } from "lucide-react";
import type { TaskDiagnosisEvidence, TaskDiagnosisFinding, TaskDiagnosisReport as TaskDiagnosisReportModel } from "../lib/taskDiagnosis";
import { Button } from "./ui/button";

type TaskDiagnosisReportProps = {
  analysisError?: string;
  analyzing?: boolean;
  onReanalyze?: () => void;
  report: TaskDiagnosisReportModel;
};

const findingLabels: Record<TaskDiagnosisFinding["type"], string> = {
  "decision-conflict": "决策冲突",
  "execution-blocker": "执行阻塞",
};

const evidenceGroups: Array<{ label: string; kinds: TaskDiagnosisEvidence["kind"][] }> = [
  { label: "讨论", kinds: ["activity"] },
  { label: "文件", kinds: ["file", "commit"] },
  { label: "任务", kinds: ["task", "goal", "criterion"] },
];

function evidenceSource(evidence: TaskDiagnosisEvidence, subject: TaskDiagnosisFinding["subject"]): string {
  if (evidence.kind === "task") return `「${evidence.source || subject.title}」`;
  return `「${subject.title}」 · ${evidence.source}`;
}

function coverageSummary(report: TaskDiagnosisReportModel): string {
  const childCount = Math.max(0, report.coverage.checkedTaskCount - 1);
  const scope = childCount ? `当前任务及 ${childCount} 个子任务` : "当前任务";
  const sources = report.coverage.contextTaskCount ? "目标、完成标准、可读文件、讨论、活动与可见依赖" : "可见依赖与已提供依据";
  return `检索范围：${scope}的${sources}`;
}

function checkedAtLabel(value?: string): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  const [year, month, day, hour, minute] = [part("year"), part("month"), part("day"), part("hour"), part("minute")];
  return year && month && day && hour && minute ? `${year}-${month}-${day} ${hour}:${minute}` : null;
}

function DiagnosisFinding({ finding }: { finding: TaskDiagnosisFinding }) {
  const Icon = finding.type === "execution-blocker" ? AlertTriangle : GitCompareArrows;
  return <article className="task-diagnosis-finding" data-severity={finding.severity} data-type={finding.type}>
    <div className="task-diagnosis-finding-marker"><Icon aria-hidden="true" size={17} /></div>
    <div className="task-diagnosis-finding-body">
      <header>
        <span>{findingLabels[finding.type]}</span>
        <h3>{finding.title}</h3>
      </header>
      <dl className="task-diagnosis-reading">
        <div><dt>建议</dt><dd>{finding.recommendation}</dd></div>
      </dl>
      <details className="task-diagnosis-evidence">
        <summary>查看依据</summary>
        <dl className="task-diagnosis-evidence-groups">{evidenceGroups.map((group) => {
          const evidence = finding.evidence.filter((item) => group.kinds.includes(item.kind));
          if (!evidence.length) return null;
          return <div key={group.label}>
            <dt>{group.label}：</dt>
            <dd><ul>{evidence.map((item) => <li key={`${item.kind}:${item.id}:${item.fact}`}>
              <p className="task-diagnosis-evidence-source">{evidenceSource(item, finding.subject)}</p>
              <p>{item.fact}</p>
            </li>)}</ul></dd>
          </div>;
        })}</dl>
      </details>
    </div>
  </article>;
}

function groupedDescendantFindings(report: TaskDiagnosisReportModel): Array<{ findings: TaskDiagnosisFinding[]; subject: TaskDiagnosisFinding["subject"] }> {
  const groups = new Map<string, { findings: TaskDiagnosisFinding[]; subject: TaskDiagnosisFinding["subject"] }>();
  for (const finding of report.findings) {
    if (finding.subject.id === report.rootTaskId) continue;
    const group = groups.get(finding.subject.id) ?? { findings: [], subject: finding.subject };
    group.findings.push(finding);
    groups.set(finding.subject.id, group);
  }
  return [...groups.values()];
}

export function TaskDiagnosisReport({ analysisError = "", analyzing = false, onReanalyze, report }: TaskDiagnosisReportProps) {
  const checkedAt = checkedAtLabel(report.checkedAt);
  const currentTaskFindings = report.findings.filter((finding) => finding.subject.id === report.rootTaskId);
  const descendantGroups = groupedDescendantFindings(report);
  return <div aria-busy={analyzing} aria-labelledby="task-diagnosis-heading" className="task-diagnosis-report">
    <header className="task-diagnosis-heading">
      <div className="task-diagnosis-heading-icon"><Stethoscope aria-hidden="true" size={19} /></div>
      <div className="task-diagnosis-heading-copy">
        <h2 id="task-diagnosis-heading">任务诊断报告</h2>
      </div>
      {onReanalyze && <Button aria-label={analyzing ? "正在重新分析任务诊断" : "重新分析任务诊断"} className="task-diagnosis-reanalyze" disabled={analyzing} onClick={onReanalyze} size="sm" type="button" variant="outline">
        {analyzing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <RefreshCw aria-hidden="true" />}
        {analyzing ? "分析中" : "重新分析"}
      </Button>}
    </header>
    {analysisError && <p className="task-diagnosis-analysis-error" role="alert">{analysisError}</p>}
    <p className="task-diagnosis-coverage">
      <span>{coverageSummary(report)}</span>
      <span className="task-diagnosis-updated-at">更新时间：{checkedAt ? <time dateTime={report.checkedAt}>{checkedAt}</time> : "未记录"}</span>
    </p>
    {report.findings.length
      ? <div className="task-diagnosis-findings">{descendantGroups.length ? <>
        {currentTaskFindings.length ? <section className="task-diagnosis-scope-group" data-scope="current">
          <h2>当前任务</h2>
          {currentTaskFindings.map((finding) => <DiagnosisFinding finding={finding} key={finding.id} />)}
        </section> : null}
        <section className="task-diagnosis-scope-group" data-scope="descendants">
          {descendantGroups.map((group) => <section className="task-diagnosis-task-group" key={group.subject.id}>
            {group.findings.map((finding) => <DiagnosisFinding finding={finding} key={finding.id} />)}
          </section>)}
        </section>
      </> : currentTaskFindings.map((finding) => <DiagnosisFinding finding={finding} key={finding.id} />)}</div>
      : <div className="task-diagnosis-empty"><strong>当前可见记录中没有发现执行阻塞或决策冲突</strong><p>这不代表任务已经完成或通过验收；诊断结果仅覆盖上方说明的数据范围。</p></div>}
  </div>;
}
