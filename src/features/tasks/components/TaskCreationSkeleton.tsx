import { useCreationI18n } from "@/shared/i18n/creation-messages";

type Section = "all" | "goal" | "criteria" | "properties";

function SkeletonLine({ kind = "body" }: { kind?: "label" | "title" | "body" | "short" }) {
  return <span className={`creation-skeleton-line is-${kind}`} />;
}

function GoalPlaceholder() {
  return <div className="creation-skeleton-field"><SkeletonLine kind="label" /><SkeletonLine /><SkeletonLine kind="short" /></div>;
}

function CriteriaPlaceholder() {
  return <div className="creation-skeleton-field"><SkeletonLine kind="label" /><div className="creation-skeleton-criteria">{[0, 1, 2].map(index => <div key={index}><span className="creation-skeleton-marker" /><SkeletonLine kind={index === 2 ? "short" : "body"} /></div>)}</div></div>;
}

function PropertiesPlaceholder() {
  const { c } = useCreationI18n();
  const labels = [c("owner"), c("participants"), c("dueDate")];
  return <div className="task-detail-properties creation-heading-properties creation-skeleton-properties">{[0, 1, 2].map(index => <div className={index === 2 ? "task-due-date-picker creation-skeleton-date" : "task-detail-property"} key={index}>
    <small className={`creation-skeleton-label${index === 2 ? " task-due-date-label" : ""}`}>{labels[index]}</small>
    <div className="creation-skeleton-control">{index < 2 ? <span className="creation-skeleton-avatar" /> : <SkeletonLine kind="short" />}</div>
  </div>)}</div>;
}

/** Decorative field shapes only; the parent owns the loading announcement. */
export function TaskCreationSkeleton({ section = "all" }: { section?: Section }) {
  return <div aria-hidden="true" className={`creation-progressive-skeleton is-${section}`}>
    {section === "all" && <div className="creation-skeleton-field creation-skeleton-title"><SkeletonLine kind="label" /><SkeletonLine kind="title" /></div>}
    {(section === "all" || section === "goal") && <GoalPlaceholder />}
    {(section === "all" || section === "criteria") && <CriteriaPlaceholder />}
    {(section === "all" || section === "properties") && <PropertiesPlaceholder />}
  </div>;
}
