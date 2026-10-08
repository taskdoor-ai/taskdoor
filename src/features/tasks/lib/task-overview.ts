export type OverviewTask = {
  dependsOnTaskIds?: string[];
  dueAt?: string;
  id: string;
  owner: string;
  status: string;
  title?: string;
  updatedAt?: string;
};

export type SubtaskProgressJudgment = {
  action: { label: string; target: "activity" | "task"; taskId?: string } | null;
  condition: string;
  detail: string;
  headline: string;
  status: string;
};

export type OverviewTaskFilters = {
  owner: string;
  status: string;
};

export type TaskDependencyEdge = {
  from: string;
  to: string;
};

export function isCanvasRelationshipActive(
  edge: TaskDependencyEdge,
  emphasizedTaskIds: Set<string>,
  focusedTaskId: string | null,
): boolean {
  return focusedTaskId === null
    || (emphasizedTaskIds.has(edge.from) && emphasizedTaskIds.has(edge.to));
}

export function filterOverviewTasks<T extends OverviewTask>(tasks: T[], filters: OverviewTaskFilters): T[] {
  return tasks.filter((task) => (
    (filters.owner === "all" || task.owner === filters.owner)
    && (filters.status === "all" || task.status === filters.status)
  ));
}

export function getFocusedTaskIds(tasks: OverviewTask[], focusedTaskId: string | null): Set<string> {
  if (!focusedTaskId) return new Set(tasks.map((task) => task.id));

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  if (!taskById.has(focusedTaskId)) return new Set();

  const dependentIdsByTaskId = new Map(tasks.map((task) => [task.id, new Set<string>()]));
  tasks.forEach((task) => {
    task.dependsOnTaskIds?.forEach((dependencyId) => {
      if (dependencyId === task.id || !taskById.has(dependencyId)) return;
      dependentIdsByTaskId.get(dependencyId)?.add(task.id);
    });
  });

  const focusedIds = new Set<string>([focusedTaskId]);
  const ancestorQueue = [focusedTaskId];
  const visitedAncestors = new Set<string>(ancestorQueue);
  while (ancestorQueue.length) {
    const taskId = ancestorQueue.shift();
    if (!taskId) continue;
    taskById.get(taskId)?.dependsOnTaskIds?.forEach((dependencyId) => {
      if (dependencyId === taskId || !taskById.has(dependencyId) || visitedAncestors.has(dependencyId)) return;
      visitedAncestors.add(dependencyId);
      focusedIds.add(dependencyId);
      ancestorQueue.push(dependencyId);
    });
  }

  const descendantQueue = [focusedTaskId];
  const visitedDescendants = new Set<string>(descendantQueue);
  while (descendantQueue.length) {
    const taskId = descendantQueue.shift();
    if (!taskId) continue;
    dependentIdsByTaskId.get(taskId)?.forEach((dependentId) => {
      if (visitedDescendants.has(dependentId)) return;
      visitedDescendants.add(dependentId);
      focusedIds.add(dependentId);
      descendantQueue.push(dependentId);
    });
  }
  return focusedIds;
}

export function getCanvasTaskPresentation<T extends OverviewTask>(tasks: T[], focusedTaskId: string | null): {
  emphasizedTaskIds: Set<string>;
  tasks: T[];
} {
  return {
    emphasizedTaskIds: getFocusedTaskIds(tasks, focusedTaskId),
    tasks,
  };
}

export function getOverviewInsightCandidateIds(
  tasks: OverviewTask[],
  role: "main" | "subtask" | "standalone",
  currentTaskId: string | null,
): string[] {
  if (role !== "subtask") return tasks.map((task) => task.id);
  return currentTaskId && tasks.some((task) => task.id === currentTaskId) ? [currentTaskId] : [];
}

export function getSubtaskProgressJudgment(tasks: OverviewTask[], currentTaskId: string | null): SubtaskProgressJudgment | null {
  if (!currentTaskId) return null;
  const currentTask = tasks.find((task) => task.id === currentTaskId);
  if (!currentTask) return null;

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const validDependencyIds = (currentTask.dependsOnTaskIds ?? []).filter((dependencyId) => dependencyId !== currentTask.id && taskById.has(dependencyId));
  const incompleteDependencyIds = getIncompleteDependencyIds(currentTask, tasks);
  const firstIncompleteTask = incompleteDependencyIds.length ? taskById.get(incompleteDependencyIds[0]) : undefined;
  const downstreamTasks = tasks.filter((task) => task.dependsOnTaskIds?.includes(currentTask.id));
  const condition = validDependencyIds.length === 0
    ? "无前置任务"
    : incompleteDependencyIds.length > 0
      ? `还有 ${incompleteDependencyIds.length} 项前置未完成`
      : "前置均完成";

  if (currentTask.status === "已取消") return {
    action: null,
    condition,
    detail: "当前任务已退出推进链路，相关任务不会继续等待其结果。",
    headline: "当前任务已取消，不再进入后续推进链路",
    status: currentTask.status,
  };

  if (currentTask.status === "已完成") return {
    action: downstreamTasks[0] ? { label: "查看后续任务", target: "task", taskId: downstreamTasks[0].id } : null,
    condition,
    detail: downstreamTasks.length ? `已有 ${downstreamTasks.length} 个后续任务可以接续当前结果。` : "当前结果已完成，可在文件与活动中查看交付事实。",
    headline: "当前任务已完成，结果可供后续任务继续使用",
    status: currentTask.status,
  };

  if (firstIncompleteTask || currentTask.status === "已阻塞") {
    const dependencyTitle = firstIncompleteTask?.title ?? "前置任务";
    const additionalCount = Math.max(0, incompleteDependencyIds.length - 1);
    return {
      action: firstIncompleteTask
        ? { label: "查看前置任务", target: "task", taskId: firstIncompleteTask.id }
        : { label: "查看相关活动", target: "activity" },
      condition,
      detail: firstIncompleteTask
        ? `「${dependencyTitle}」尚未完成${additionalCount ? `，另有 ${additionalCount} 项前置未完成` : ""}，会影响当前任务继续推进。`
        : "任务当前处于阻塞状态，需要先核对活动中的阻塞原因。",
      headline: firstIncompleteTask
        ? `当前任务暂时受阻，需先完成「${dependencyTitle}」`
        : "当前任务暂时受阻，需要先处理阻塞原因",
      status: currentTask.status,
    };
  }

  if (currentTask.status === "待审核") return {
    action: { label: "查看审核活动", target: "activity" },
    condition,
    detail: "当前成果正在等待确认，审核结果会决定后续流转。",
    headline: "当前任务正在等待审核，结果确认后可继续流转",
    status: currentTask.status,
  };

  if (currentTask.status === "进行中") return {
    action: null,
    condition,
    detail: "当前没有未完成的前置依赖，可继续围绕既定目标推进。",
    headline: "当前任务正在推进，暂无未完成的前置依赖",
    status: currentTask.status,
  };

  return {
    action: null,
    condition,
    detail: "当前没有未完成的前置依赖，可按计划开始当前任务。",
    headline: "前置条件已满足，可按计划开始推进",
    status: currentTask.status,
  };
}

export function getVisibleDependencyEdges(tasks: OverviewTask[], visibleTaskIds: Set<string>): TaskDependencyEdge[] {
  const cyclicGroupByTaskId = new Map(getCyclicTaskGroups(tasks).flatMap((group, index) => group.map((taskId) => [taskId, index] as const)));
  return tasks.flatMap((task) => task.dependsOnTaskIds
    ?.filter((dependencyId) => dependencyId !== task.id
      && visibleTaskIds.has(task.id)
      && visibleTaskIds.has(dependencyId)
      && !(cyclicGroupByTaskId.has(task.id) && cyclicGroupByTaskId.get(task.id) === cyclicGroupByTaskId.get(dependencyId)))
    .map((dependencyId) => ({ from: dependencyId, to: task.id })) ?? []);
}

export function getIncompleteDependencyIds(task: OverviewTask, tasks: OverviewTask[]): string[] {
  if (task.status === "已完成" || task.status === "已取消") return [];
  const taskById = new Map(tasks.map((item) => [item.id, item]));
  return (task.dependsOnTaskIds ?? []).filter((dependencyId) => {
    const dependency = taskById.get(dependencyId);
    return dependency !== undefined && dependency.id !== task.id && dependency.status !== "已完成";
  });
}

export function getAttentionTaskIds(tasks: OverviewTask[]): Set<string> {
  return new Set(tasks
    .filter((task) => task.status !== "已完成" && task.status !== "已取消" && (task.status === "已阻塞" || getIncompleteDependencyIds(task, tasks).length > 0))
    .map((task) => task.id));
}

function getStronglyConnectedComponents(tasks: OverviewTask[]): string[][] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const indexByTaskId = new Map<string, number>();
  const lowLinkByTaskId = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let nextIndex = 0;

  const visit = (taskId: string) => {
    indexByTaskId.set(taskId, nextIndex);
    lowLinkByTaskId.set(taskId, nextIndex);
    nextIndex += 1;
    stack.push(taskId);
    onStack.add(taskId);
    const task = taskById.get(taskId);
    (task?.dependsOnTaskIds ?? [])
      .filter((dependencyId) => dependencyId !== taskId && taskById.has(dependencyId))
      .forEach((dependencyId) => {
        if (!indexByTaskId.has(dependencyId)) {
          visit(dependencyId);
          lowLinkByTaskId.set(taskId, Math.min(lowLinkByTaskId.get(taskId) ?? 0, lowLinkByTaskId.get(dependencyId) ?? 0));
        } else if (onStack.has(dependencyId)) {
          lowLinkByTaskId.set(taskId, Math.min(lowLinkByTaskId.get(taskId) ?? 0, indexByTaskId.get(dependencyId) ?? 0));
        }
      });

    if (lowLinkByTaskId.get(taskId) !== indexByTaskId.get(taskId)) return;
    const component: string[] = [];
    let member = "";
    do {
      member = stack.pop() ?? "";
      if (!member) break;
      onStack.delete(member);
      component.push(member);
    } while (member !== taskId);
    if (component.length) components.push(component);
  };

  tasks.forEach((task) => { if (!indexByTaskId.has(task.id)) visit(task.id); });
  return components;
}

export function getCyclicTaskGroups(tasks: OverviewTask[]): string[][] {
  return getStronglyConnectedComponents(tasks).filter((component) => component.length > 1);
}

export function getCyclicTaskIds(tasks: OverviewTask[]): Set<string> {
  return new Set(getCyclicTaskGroups(tasks).flat());
}

export function getDependencyLevelByTaskId(tasks: OverviewTask[]): Map<string, number> {
  const components = getStronglyConnectedComponents(tasks);
  const componentByTaskId = new Map(components.flatMap((component, index) => component.map((taskId) => [taskId, index] as const)));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const levelByComponent = new Map<number, number>();

  const getComponentLevel = (componentIndex: number): number => {
    const cached = levelByComponent.get(componentIndex);
    if (cached !== undefined) return cached;
    const dependencyComponents = new Set<number>();
    components[componentIndex]?.forEach((taskId) => {
      (taskById.get(taskId)?.dependsOnTaskIds ?? []).forEach((dependencyId) => {
        const dependencyComponent = componentByTaskId.get(dependencyId);
        if (dependencyComponent !== undefined && dependencyComponent !== componentIndex) dependencyComponents.add(dependencyComponent);
      });
    });
    const level = dependencyComponents.size ? Math.max(...[...dependencyComponents].map(getComponentLevel)) + 1 : 0;
    levelByComponent.set(componentIndex, level);
    return level;
  };

  return new Map(tasks.map((task) => [task.id, getComponentLevel(componentByTaskId.get(task.id) ?? 0)]));
}

const relativeTimeRank = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  if (value === "刚刚") return 0;
  const minuteMatch = value.match(/(\d+)\s*分钟/);
  if (minuteMatch) return Number(minuteMatch[1]);
  const hourMatch = value.match(/(\d+)\s*小时/);
  if (hourMatch) return Number(hourMatch[1]) * 60;
  if (value.includes("今天")) return 12 * 60;
  if (value.includes("昨天")) return 24 * 60;
  const dayMatch = value.match(/(\d+)\s*天/);
  if (dayMatch) return Number(dayMatch[1]) * 24 * 60;
  return Number.POSITIVE_INFINITY;
};

export function getMostRecentlyUpdatedTask<T extends OverviewTask>(tasks: T[]): T | undefined {
  return [...tasks].sort((a, b) => relativeTimeRank(a.updatedAt) - relativeTimeRank(b.updatedAt))[0];
}
