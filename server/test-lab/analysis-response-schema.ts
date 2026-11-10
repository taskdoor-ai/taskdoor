type AnalysisSchemaTask = { id: string; criteria?: { items?: unknown[] } };
type AnalysisSchemaInput = {
  requestId?: string;
  taskId?: string | null;
  inputVersions?: Record<string, unknown>;
  sources?: Array<{ ref?: string }>;
  context?: { sourceRefs?: Array<{ id?: string }>; discussions?: Array<{ id?: string }> };
  analysisContext?: { tasks?: AnalysisSchemaTask[] };
  tasks?: AnalysisSchemaTask[];
  evidence?: Array<{ content?: string; readState?: string }>;
};

/** Decoder constraints describe the public proposal contract, never inferred business answers. */
export function analysisResponseSchema(input?: AnalysisSchemaInput) {
  const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
    type: 'object', properties, required, additionalProperties: false,
  });
  const array = (items: unknown) => ({ type: 'array', items });
  const nullable = (schema: unknown) => ({ anyOf: [{ type: 'null' }, schema] });
  const text = { type: 'string' };
  const strings = array(text);
  const number = { type: 'number', minimum: 0 };
  const minutes = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER };
  const date = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
  const version = { type: ['integer', 'null'], minimum: 0 };
  const state = { enum: ['current', 'unknown', 'stale'] };
  const displayPercent = { enum: [0, 25, 50, 75, 100, null] };
  const versions = { type: 'object' };
  const tasks = input?.analysisContext?.tasks ?? input?.tasks ?? [];
  const criterionIds = (items: unknown[] = []) => items.flatMap(item => {
    const id = item && typeof item === 'object' && 'id' in item ? item.id : null;
    return typeof id === 'string' && id.length ? [id] : [];
  });
  // Keep this directory aligned with validateOutput; candidate estimate IDs are not sources.
  const knownRefs = [...new Set([
    input?.requestId,
    ...(input?.sources ?? []).map(source => source.ref),
    ...(input?.context?.sourceRefs ?? []).map(source => source.id),
    ...(input?.context?.discussions ?? []).map(source => source.id),
    ...tasks.flatMap(task => criterionIds(task.criteria?.items)),
  ].filter((ref): ref is string => typeof ref === 'string' && ref.length > 0))];
  const sourceId = knownRefs.length ? { type: 'string', enum: knownRefs } : text;
  const evidenceRefs = { $ref: '#/$defs/evidenceRefs' };
  const currentCriteria = tasks.find(task => task.id === input?.taskId)?.criteria?.items;
  const currentCriterionIds = criterionIds(currentCriteria);
  const criterionId = currentCriterionIds.length ? { enum: [...currentCriterionIds, null] } : { type: ['string', 'null'] };
  const records = (input?.evidence ?? []).flatMap(evidence => {
    if (evidence.readState === 'unavailable') return [];
    try {
      const record: unknown = JSON.parse(evidence.content ?? '');
      return record && typeof record === 'object' && !Array.isArray(record) ? [record as Record<string, any>] : [];
    } catch { return []; }
  });
  const isMinutes = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const isDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const hasRecordedWorkload = records.some(record => Array.isArray(record.workload) && record.workload.length > 0
    && record.workload.every((point: any) => point && isDate(point.at) && isMinutes(point.scopeMinutes) && isMinutes(point.completedMinutes) && typeof point.scopeVersion === 'string' && point.scopeVersion.length > 0));
  const hasCreation = records.some(record => record.creation && isDate(record.creation.at) && isMinutes(record.creation.scopeMinutes));
  const hasRecordedStart = hasCreation || records.some(record => isDate(record.timing?.startOn) || isDate(record.startOn));
  const hasSchedule = records.some(record => Array.isArray(record.executionSchedule) && record.executionSchedule.length > 0
    && record.executionSchedule.every((point: any) => point?.confirmed === true && isMinutes(point.remainingMinutes) && isDate(point.deliveryOn) && isDate(point.reviewOn)));

  const dimensionCheck = object({
    decision: { enum: ['include', 'adjust', 'not_applicable', 'unknown'] },
    work: text, quantity: nullable(text), reason: text, evidenceRefs,
  });
  const estimate = object({
    basis: { enum: ['platform', 'team_rule', 'history', 'unknown'] }, estimationRuleVersion: text,
    items: array(object({
      id: text, breakdownItem: text,
      criteriaRefs: array({ anyOf: [
        currentCriterionIds.length ? { type: 'string', enum: currentCriterionIds } : text,
        object({ taskId: text, index: { type: 'integer', minimum: 0 }, text }),
      ] }),
      dimensionChecks: object(Object.fromEntries([
        'deliverableScale', 'implementationDifficulty', 'uncertainty', 'inputReadiness',
        'coordination', 'iteration', 'verification', 'tooling',
      ].map(key => [key, { $ref: '#/$defs/dimensionCheck' }]))),
      quantity: nullable(text), basis: text,
      additionalFactors: array(object({ factor: text, affectedItemIds: strings, reason: text, evidenceRefs })),
      threePoint: object({
        optimisticMinutes: nullable(number), mostLikelyMinutes: nullable(number),
        pessimisticMinutes: nullable(number), expectedMinutes: nullable(number),
      }),
      ewdMinutes: nullable(number), evidenceRefs,
    })),
    knownEwdMinutes: number, totalEwdMinutes: nullable(number), personDays: nullable(number), assumptions: strings, unknowns: strings,
  });
  const criterion = object({
    criterionId, text, criteriaVersion: version,
    completedContent: strings, remainingContent: strings, pendingChecks: strings, reason: text, evidenceRefs,
    state, percent: displayPercent,
  });
  const resultEntry = object({ text, evidenceRefs });
  const point = object({ at: date, completedMinutes: minutes });
  const creation = object({ at: date, scopeMinutes: minutes });
  const comparison = object({
    asOf: date, explanation: text,
    workload: { type: 'array', minItems: 1, items: object({ at: date, scopeMinutes: minutes, completedMinutes: minutes, scopeVersion: text, note: text }, ['at', 'scopeMinutes', 'completedMinutes', 'scopeVersion']) },
    creation: hasCreation ? creation : nullable(creation),
    aiAssessment: object({ observedAt: text, completedMinutes: minutes, scopeMinutes: minutes, scopeVersion: text, basis: text }, ['observedAt', 'completedMinutes', 'scopeMinutes', 'scopeVersion']),
    expected: object({ scopeVersion: text, points: array(point) }),
    forecastTrend: object({
      asOf: date, scopeVersion: text, startMinutes: minutes,
      points: array(object({ at: date, completedMinutes: minutes, note: text })),
      scopePoints: array(object({ at: date, scopeMinutes: minutes, note: text })),
    }, ['asOf', 'scopeVersion', 'startMinutes', 'points']),
    timing: object({ startOn: date, dueOn: nullable(date), forecastOn: nullable(date), completedOn: date, scopeVersion: text, basis: text }, ['startOn', 'dueOn', 'forecastOn', 'scopeVersion', 'basis']),
  }, ['asOf', 'explanation', 'workload', 'creation', 'expected', 'timing', ...(hasSchedule ? ['forecastTrend'] : [])]);
  const trend = object({
    points: { type: 'array', minItems: 1, items: object({
      at: date, totalEwdMinutes: minutes, completedEwdMinutes: minutes, unconfirmedEwdMinutes: minutes,
      inputVersions: versions, changeReasons: strings,
    }) },
    explanation: text,
  });
  return {
    ...object({
      schemaVersion: { const: 'agentdoor.task-status-analysis.v0.1' }, skillId: { const: 'agentdoor-task-status-analyzer' },
      ruleVersion: text, requestId: text, principalId: text, teamId: text,
      inputVersions: input?.inputVersions === undefined ? versions : { ...versions, const: input.inputVersions }, coverage: { type: 'object' },
      evaluatedAt: text, status: { enum: ['ready', 'partial', 'needs_context', 'no_change', 'stale'] },
      result: object({
        taskId: text, taskVersion: { type: ['string', 'number'] }, formalStatus: text, formalStatusUnchanged: { const: true },
        criteriaVersion: version,
        criterionAssessments: { type: 'array', ...(currentCriteria === undefined ? {} : { minItems: currentCriteria.length, maxItems: currentCriteria.length }), items: criterion },
        currentSituation: object({
          summary: text, confirmedResults: array(resultEntry), unmetResults: array(resultEntry), pendingChecks: array(resultEntry), recentChanges: array(resultEntry), evidenceRefs,
        }),
        nextActions: array(object({ action: text, actorId: { type: ['string', 'null'] }, diagnosisType: { enum: ['execution_blockage', 'decision_conflict', null] }, reason: text, evidenceRefs })),
        progress: object({
          state, displayPercent, ewdResultRef: nullable(text), inputVersions: nullable(versions),
          estimate: { ...nullable({ $ref: '#/$defs/estimate' }), description: '本次必要补估或重估时返回完整 EWD 提案；复用有效估算或尚不足以估算时为 null，不补造工作条件。' },
          totalEwdMinutes: nullable(number), completedEwdMinutes: nullable(number), completionPercent: { type: ['number', 'null'], minimum: 0, maximum: 100 },
          knownCompletedEwdMinutes: nullable(number), unconfirmedEwdMinutes: nullable(number),
          trend: hasRecordedWorkload ? trend : nullable(trend),
          comparison: hasRecordedWorkload && hasRecordedStart ? comparison : nullable(comparison), reason: text,
        }),
      }),
      evidenceRefs, unknowns: strings, warnings: strings, writeReceipt: { type: 'null' },
    }),
    $defs: { evidenceRefs: array(sourceId), dimensionCheck, estimate },
  };
}
