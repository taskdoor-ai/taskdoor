import { getTaskProgressComparison, type ProgressForecastTrend, type ProgressScopeForecastPoint, type ProgressWorkloadSnapshot, type TaskProgressComparisonSeries } from "../lib/taskProgressComparison";

/** Roll up saved observations only after every child has a known first record. */
export function rollupProgressHistory(children: readonly TaskProgressComparisonSeries[], prefix: string): ProgressWorkloadSnapshot[] {
  if (!children.length || children.some(child => !child.workload.length)) return [];
  const firstCompleteDate = children.map(child => child.workload[0].at).sort().at(-1)!;
  const dates = [...new Set(children.flatMap(child => child.workload.map(point => point.at)))].filter(at => at >= firstCompleteDate).sort();
  let lastVersions = "", version = 0;
  return dates.map(at => {
    const points = children.map(child => child.workload.filter(point => point.at <= at).at(-1)!);
    const versions = JSON.stringify(points.map(point => point.scopeVersion));
    if (versions !== lastVersions) { version += 1; lastVersions = versions; }
    const notes = [...new Set(points.filter(point => point.at === at).map(point => point.note).filter(Boolean))];
    return { at, scopeMinutes: points.reduce((sum, point) => sum + point.scopeMinutes, 0),
      completedMinutes: points.reduce((sum, point) => sum + point.completedMinutes, 0),
      scopeVersion: `${prefix}-v${version}`,
      note: `按截至该日各子任务最近记录汇总。${notes.join("；")}` };
  });
}

/** Combine saved future delivery checkpoints; missing child forecasts never become zeroes. */
export function rollupProgressForecast(children: readonly TaskProgressComparisonSeries[], latest: ProgressWorkloadSnapshot): ProgressForecastTrend | undefined {
  const models = children.map(child => getTaskProgressComparison(child));
  if (!models.length || models.some(model => !model || model.latest.at > latest.at
    || model.latest.completedMinutes < model.latest.scopeMinutes && (!model.forecastPoints.length || model.forecastOn! < latest.at))) return undefined;
  const known = models.filter((model): model is NonNullable<typeof model> => Boolean(model));
  // Children keep their own evidence dates. A confirmation advances the parent's
  // observation date, but does not turn another child's prediction into history.
  const dates = [...new Set(known.flatMap(model => [...model.forecastPoints,...model.forecastScopePoints].map(point => point.at)))].filter(at => at > latest.at).sort();
  if (!dates.length) return undefined;
  let previousScope=latest.scopeMinutes;
  const scopePoints:ProgressScopeForecastPoint[]=[];
  for(const at of dates){
    const scopeMinutes=known.reduce((sum,model)=>sum+(model.forecastScopePoints.filter(point=>point.at<=at).at(-1)?.scopeMinutes ?? model.latest.scopeMinutes),0);
    if(scopeMinutes!==previousScope){
      scopePoints.push({at,scopeMinutes,note:known.flatMap(model=>model.forecastScopePoints.filter(point=>point.at<=at).slice(-1).map(point=>point.note)).join("；")});
      previousScope=scopeMinutes;
    }
  }
  return { asOf: latest.at, scopeVersion: latest.scopeVersion, startMinutes: latest.completedMinutes,
    ...(scopePoints.length ? {scopePoints} : {}),
    points: dates.map(at => ({ at,
      completedMinutes: known.reduce((sum, model) => sum + (model.forecastPoints.filter(point => point.at <= at).at(-1)?.completedMinutes ?? model.latest.completedMinutes), 0),
      note: `演示预测节点：${known.filter(model => model.forecastPoints.some(point => point.at === at)).length} 个子任务预计在本日更新交付，其余沿用此前预测量。`,
    })),
  };
}
