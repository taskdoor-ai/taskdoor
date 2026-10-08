import { useGlobalUi } from "../i18n/globalUi";
import React from "react";

const percent = (ratio: number) => `${Number((ratio * 100).toFixed(1))}%`;

/** Forecasts use the same dashed marker, anchored label and hover description on either scale. */
export function TaskPredictionMarker({ position, label, description, markerLabel = label, showLabel = true }: {
  position: number;
  label: string;
  description?: string;
  markerLabel?: string;
  showLabel?: boolean;
}) {
  return <>
    <span aria-label={markerLabel} title={description} className="task-progress-pace-marker" role="img" style={{left:`${position}%`}}/>
    {showLabel && <span className="task-progress-expected-label" title={description} style={{left:`clamp(min(50%, 56px), ${position}%, max(50%, calc(100% - 56px)))`}}>{label}</span>}
  </>;
}

/** A shared scale for actual work and the expected position at the same observation time. */
export function TaskProgressTrack({ actualRatio, expectedRatio, label, actualDescription, expectedDescription }: {
  actualRatio: number | null;
  expectedRatio: number | null;
  label: string;
  actualDescription?: string;
  expectedDescription?: string;
}) {
  const ui = useGlobalUi();
  const actualPercent = actualRatio === null ? null : actualRatio * 100;
  return <div className="task-progress-race-track" data-has-expected={expectedRatio !== null}>
    {actualPercent !== null
      ? <div aria-label={label} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Number(actualPercent.toFixed(6))} aria-valuetext={actualDescription} title={actualDescription} className="task-progress-actual-track" role="progressbar"><span style={{width:`${actualPercent}%`}}/></div>
      : <div aria-label={`${label}：${actualDescription ?? ui("进度未知")}`} className="task-progress-actual-track" role="img" />}
    {expectedRatio !== null && <>
      {actualPercent !== null && <span aria-hidden="true" className="task-progress-race-gap" style={{left:`${Math.min(actualPercent,expectedRatio*100)}%`,width:`${Math.abs(actualPercent-expectedRatio*100)}%`}}/>}
      <TaskPredictionMarker position={expectedRatio*100} label={ui("计划应完成 {0}", {0: percent(expectedRatio)})} markerLabel={ui("计划应完成位置 {0}", {0: percent(expectedRatio)})} description={expectedDescription}/>
    </>}
    {actualPercent !== null && <span aria-hidden="true" className="task-progress-actual-head" style={{left:`${actualPercent}%`}}/>}
  </div>;
}
