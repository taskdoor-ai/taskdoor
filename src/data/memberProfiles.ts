import { readWorkspaceSession, workspaceProfileKey } from "../lib/workspaceSession";

export type ResponsibilityEvidence = {
  id: string;
  label: string;
  meta: string;
  taskId?: string;
};

export type ResponsibilityProposal =
  | {
      baseRevisionId: string;
      operation: "add";
    }
  | {
      baseRevisionId: string;
      operation: "update";
      target: {
        expectedText: string;
        paragraphIndex: number;
      };
    };

export type ResponsibilityClaim = {
  id: string;
  kind: "formal" | "self-declared" | "observed";
  label: string;
  description: string;
  sourceLabel: string;
  updatedAt: string;
  evidence?: ResponsibilityEvidence[];
  correctedBySelf?: boolean;
  originalLabel?: string;
  originalDescription?: string;
  aiActor?: string;
  ruleVersion?: string;
  changeSetId?: string;
  proposal?: ResponsibilityProposal;
  reviewState?: "active" | "accepted" | "hidden" | "disputed";
  changeHistory?: Array<{
    id: string;
    actor: string;
    action: "accepted" | "corrected" | "hidden" | "disputed" | "restored";
    at: string;
    appliedText?: string;
    previousText?: string;
    resultRevisionId?: string;
  }>;
};

export type ResponsibilityDocument = {
  content: string;
  updatedAt: string;
  updatedBy: string;
  revisionId: string;
};

export type TeamAccessRole = "admin" | "member";

export type TeamMembership = {
  name?: string;
  emailInvitation?: { token: string; inviter: string; createdAt: number; expiresAt: number; delivery: "preview" };
  email: string;
  id: string;
  invitedAt?: string;
  memberId?: string;
  responsibility?: string;
  role: TeamAccessRole;
  status: "active" | "invited";
};

export type TeamResponsibilityProfile = {
  createdBy?: string;
  id: string;
  name: string;
  role: string;
  coverage: string;
  missingSources: string;
  lastSyncedAt: string;
  inviteToken: string;
  memberships: TeamMembership[];
  responsibilityAutoUpdate?: boolean;
  responsibilityDocument: ResponsibilityDocument;
  observedClaims: ResponsibilityClaim[];
};

export type PersonalCenterState = {
  profile: {
    avatarDataUrl?: string;
    name: string;
    email: string;
    title: string;
    timezone: string;
    bio: string;
  };
  teams: TeamResponsibilityProfile[];
};

export const personalCenterStorageKey = "agentdoor-personal-center-v6";
export const personalCenterChangedEvent = "agentdoor-personal-center-changed";
export const getTeamInviteLink = ({ inviteToken }: Pick<TeamResponsibilityProfile, "id" | "inviteToken">) => `${typeof window === "undefined" ? "http://127.0.0.1:5173" : window.location.origin}/signup?invite=${encodeURIComponent(inviteToken)}`;
export const isValidProfileEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function applyPersonalProfileDraft(
  state: PersonalCenterState,
  draft: PersonalCenterState["profile"],
  currentUserId: string,
): PersonalCenterState {
  const email = draft.email.trim().toLocaleLowerCase();
  return {
    ...state,
    profile: {
      ...draft,
      email,
      name: draft.name.trim(),
    },
    teams: state.teams.map((team) => ({
      ...team,
      memberships: team.memberships.map((membership) => membership.memberId === currentUserId
        ? { ...membership, email }
        : membership),
    })),
  };
}

const legacyPersonalCenterV5StorageKey = "agentdoor-personal-center-v5";
const legacyPersonalCenterV4StorageKey = "agentdoor-personal-center-v4";
const legacyPersonalCenterV3StorageKey = "agentdoor-personal-center-v3";
const legacyPersonalCenterV2StorageKey = "agentdoor-personal-center-v2";
const legacyPersonalCenterV1StorageKey = "agentdoor-personal-center-v1";

const creatorCommerceMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "creator-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "chenmo@agentdoor.local", id: "creator-member-chenmo", memberId: "陈默", role: "member", status: "active" },
  { email: "linjie@agentdoor.local", id: "creator-member-linjie", memberId: "林洁", role: "member", status: "active" },
  { email: "gaoyuan@agentdoor.local", id: "creator-member-gaoyuan", memberId: "高远", role: "member", status: "active" },
  { email: "liangchuan@agentdoor.local", id: "creator-member-liangchuan", memberId: "梁川", role: "member", status: "active" },
  { email: "xuning@agentdoor.local", id: "creator-member-xuning", memberId: "许宁", role: "member", status: "active" },
  { email: "hanxu@agentdoor.local", id: "creator-member-hanxu", memberId: "韩序", role: "member", status: "active" },
  { email: "suhe@agentdoor.local", id: "creator-member-suhe", memberId: "苏禾", role: "member", status: "active" },
];

const platformMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "platform-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "chengyan@agentdoor.local", id: "platform-member-chengyan", memberId: "程砚", role: "member", status: "active" },
  { email: "qiaoan@agentdoor.local", id: "platform-member-qiaoan", memberId: "乔安", role: "member", status: "active" },
  { email: "tangche@agentdoor.local", id: "platform-member-tangche", memberId: "唐澈", role: "member", status: "active" },
  { email: "yening@agentdoor.local", id: "platform-member-yening", memberId: "叶宁", role: "member", status: "active" },
  { email: "songheng@agentdoor.local", id: "platform-member-songheng", memberId: "宋衡", role: "member", status: "active" },
  { email: "guyan@agentdoor.local", id: "platform-member-guyan", memberId: "顾言", role: "member", status: "active" },
  { email: "xuyue@agentdoor.local", id: "platform-member-xuyue", memberId: "许悦", role: "member", status: "active" },
];

const supplyOperationsMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "supply-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "shengong@agentdoor.local", id: "supply-member-shengong", memberId: "沈工", role: "member", status: "active" },
  { email: "zhaoyan@agentdoor.local", id: "supply-member-zhaoyan", memberId: "赵妍", role: "member", status: "active" },
  { email: "heqing@agentdoor.local", id: "supply-member-heqing", memberId: "贺青", role: "member", status: "active" },
  { email: "luoxiao@agentdoor.local", id: "supply-member-luoxiao", memberId: "罗骁", role: "member", status: "active" },
  { email: "tangjing@agentdoor.local", id: "supply-member-tangjing", memberId: "唐静", role: "member", status: "active" },
  { email: "fengwei@agentdoor.local", id: "supply-member-fengwei", memberId: "冯维", role: "member", status: "active" },
  { email: "chenchen@agentdoor.local", id: "supply-member-chenchen", memberId: "陈琛", role: "member", status: "active" },
];

const customerSuccessMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "service-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "shenwen@agentdoor.local", id: "service-member-shenwen", memberId: "沈闻", role: "member", status: "active" },
  { email: "bailu@agentdoor.local", id: "service-member-bailu", memberId: "白露", role: "member", status: "active" },
  { email: "chenqin@agentdoor.local", id: "service-member-chenqin", memberId: "陈沁", role: "member", status: "active" },
  { email: "xuehang@agentdoor.local", id: "service-member-xuehang", memberId: "薛航", role: "member", status: "active" },
  { email: "jiangyu@agentdoor.local", id: "service-member-jiangyu", memberId: "江予", role: "member", status: "active" },
  { email: "luyao@agentdoor.local", id: "service-member-luyao", memberId: "陆遥", role: "member", status: "active" },
  { email: "zhoumu@agentdoor.local", id: "service-member-zhoumu", memberId: "周牧", role: "member", status: "active" },
];

const teamSettingsFixture = (teamId: string) => ({
  inviteToken: teamId === "creator-commerce" ? "creator-commerce-6kfuzvtc" : teamId === "platform" ? "platform-4nq7h2ks" : teamId === "supply-operations" ? "supply-operations-8p3m5r2x" : teamId === "customer-success" ? "customer-success-2w9d6k4q" : `${teamId}-invite`,
  memberships: (teamId === "creator-commerce" ? creatorCommerceMemberships : teamId === "platform" ? platformMemberships : teamId === "supply-operations" ? supplyOperationsMemberships : teamId === "customer-success" ? customerSuccessMemberships : []).map((membership) => ({ ...membership })),
});

export const initialPersonalCenterState: PersonalCenterState = {
  profile: {
    name: "周岚",
    email: "zhoulan@agentdoor.local",
    title: "内容电商负责人",
    timezone: "中国标准时间 · UTC+8",
    bio: "负责把达人带货目标转成团队可执行的分工，协调预算、进度与最终结果。",
  },
  teams: [
    {
      id: "creator-commerce",
      name: "达人带货运营团队",
      role: "内容电商负责人",
      coverage: "覆盖最近 90 天 TaskDoor 内的达人合作、内容、直播、商品、投流、数据与合规任务。",
      missingSources: "未覆盖达人私聊、外部投放平台和线下沟通记录。",
      lastSyncedAt: "今天 09:20",
      ...teamSettingsFixture("creator-commerce"),
      responsibilityDocument: {
        content: "达人带货目标、预算、跨角色协调与最终结果",
        updatedAt: "2026-08-18",
        updatedBy: "周岚",
        revisionId: "RESP-CREATOR-008",
      },
      observedClaims: [
        {
          id: "creator-observed-goal",
          kind: "observed",
          label: "达人带货目标与预算确认",
          description: "负责达人带货目标、资源优先级、项目预算、跨角色协调与最终结果确认。",
          sourceLabel: "AI 根据已确认结果更新",
          updatedAt: "今天 09:20",
          aiActor: "TaskDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-20260827-014",
          proposal: {
            baseRevisionId: "RESP-CREATOR-008",
            operation: "update",
            target: {
              expectedText: "达人带货目标、预算、跨角色协调与最终结果",
              paragraphIndex: 0,
            },
          },
          reviewState: "active",
          changeHistory: [],
          evidence: [
            { id: "creator-goal", label: "香氛礼盒达人带货目标与分工", meta: "已确认决定 · 2 天前", taskId: "fragrance-creator-wrapup" },
            { id: "media-budget", label: "第二轮投流预算调整任务", meta: "任务结果记录 · 昨天", taskId: "fragrance-growth" },
          ],
        },
        {
          id: "creator-observed-coordination",
          kind: "observed",
          label: "跨角色结果整合",
          description: "整合达人商务、内容、直播、商品、投流、数据与合规结果，形成下一步项目决定。",
          sourceLabel: "AI 根据已确认结果更新",
          updatedAt: "昨天 18:40",
          aiActor: "TaskDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-20260826-031",
          proposal: { baseRevisionId: "RESP-CREATOR-008", operation: "add" },
          reviewState: "active",
          changeHistory: [],
          evidence: [
            { id: "creator-wrapup", label: "香氛礼盒达人带货收尾", meta: "结果交回并确认 · 昨天", taskId: "fragrance-creator-wrapup" },
          ],
        },
      ],
    },
    {
      id: "platform",
      name: "协作平台团队",
      role: "产品发布负责人",
      coverage: "覆盖移动端发布、API、双端客户端、安全、SRE、质量与客户支持的本地合成记录。",
      missingSources: "未覆盖应用商店后台实时状态和生产遥测正文。",
      lastSyncedAt: "今天 10:10",
      ...teamSettingsFixture("platform"),
      responsibilityDocument: {
        content: "负责移动端版本目标、发布范围、跨 API／客户端／SRE／安全／质量与支持团队的节奏，以及最终 Go/No-Go 决定。",
        updatedAt: "2026-08-29",
        updatedBy: "周岚",
        revisionId: "RESP-PLATFORM-009",
      },
      observedClaims: [
        {
          id: "platform-observed-release-gate",
          kind: "observed",
          label: "跨端发布门禁收口",
          description: "负责整合客户端、服务端、安全与运行保障结论，确定移动端版本的发布范围及最终 Go/No-Go 决定。",
          sourceLabel: "AI 根据本地合成记录更新",
          updatedAt: "今天 10:10",
          aiActor: "TaskDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-PLATFORM-20260901-003",
          proposal: {
            baseRevisionId: "RESP-PLATFORM-009",
            operation: "update",
            target: {
              expectedText: "负责移动端版本目标、发布范围、跨 API／客户端／SRE／安全／质量与支持团队的节奏，以及最终 Go/No-Go 决定。",
              paragraphIndex: 0,
            },
          },
          reviewState: "active",
          changeHistory: [],
          evidence: [{ id: "platform-release-gate", label: "移动端 3.8.0 发布门禁", meta: "今天", taskId: "platform-mobile-release" }],
        },
      ],
    },
    {
      id: "supply-operations",
      name: "智能硬件试产团队",
      role: "NPI 项目负责人",
      coverage: "覆盖供应商质量、工艺、产线、质量、包装、培训和物料的本地合成记录。",
      missingSources: "未覆盖 MES 实时节拍、供应商门户和实验室原始仪器数据。",
      lastSyncedAt: "今天 08:40",
      ...teamSettingsFixture("supply-operations"),
      responsibilityDocument: {
        content: "负责 PVT 试产目标、跨供应商与制造职能协调、偏差处理边界和量产 Go/No-Go 决定。",
        updatedAt: "2026-08-28",
        updatedBy: "周岚",
        revisionId: "RESP-SUPPLY-006",
      },
      observedClaims: [
        {
          id: "supply-observed-pilot-release",
          kind: "observed",
          label: "PVT 放行条件整合",
          description: "负责整合供应商、工艺、质量与产能证据，确定 PVT 试产放行边界及量产 Go/No-Go 决定。",
          sourceLabel: "AI 根据本地合成记录更新",
          updatedAt: "今天 08:40",
          aiActor: "TaskDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-SUPPLY-20260901-002",
          proposal: {
            baseRevisionId: "RESP-SUPPLY-006",
            operation: "update",
            target: {
              expectedText: "负责 PVT 试产目标、跨供应商与制造职能协调、偏差处理边界和量产 Go/No-Go 决定。",
              paragraphIndex: 0,
            },
          },
          reviewState: "active",
          changeHistory: [],
          evidence: [{ id: "factory-pvt-gate", label: "智能门锁 PVT 试产放行", meta: "今天", taskId: "factory-pilot-ramp" }],
        },
      ],
    },
    {
      id: "customer-success",
      name: "企业客户成功团队",
      role: "重大事件指挥官",
      coverage: "覆盖重大事件、数据修复、客户沟通、SLA 与防复发的本地合成记录。",
      missingSources: "未覆盖生产日志正文、客户邮件和正式合同附件。",
      lastSyncedAt: "今天 11:05",
      ...teamSettingsFixture("customer-success"),
      responsibilityDocument: {
        content: "负责重大客户事件的影响边界、恢复优先级、跨团队决策、对外结论与改进项闭环。",
        updatedAt: "2026-08-30",
        updatedBy: "周岚",
        revisionId: "RESP-SERVICE-011",
      },
      observedClaims: [
        {
          id: "service-observed-incident-command",
          kind: "observed",
          label: "重大事件跨团队指挥",
          description: "负责协调重大客户事件中的服务恢复、数据修复、客户沟通与商业处理，统一正式事实并推动改进项闭环。",
          sourceLabel: "AI 根据本地合成记录更新",
          updatedAt: "今天 11:05",
          aiActor: "TaskDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-SERVICE-20260901-005",
          proposal: {
            baseRevisionId: "RESP-SERVICE-011",
            operation: "update",
            target: {
              expectedText: "负责重大客户事件的影响边界、恢复优先级、跨团队决策、对外结论与改进项闭环。",
              paragraphIndex: 0,
            },
          },
          reviewState: "active",
          changeHistory: [],
          evidence: [{ id: "service-incident", label: "企业同步故障恢复与客户闭环", meta: "今天", taskId: "service-incident-recovery" }],
        },
      ],
    },
  ],
};

const cloneInitialState = () => JSON.parse(JSON.stringify(initialPersonalCenterState)) as PersonalCenterState;

const responsibilityEvidenceTaskIds: Record<string, string> = {
  "creator-goal": "fragrance-creator-wrapup",
  "media-budget": "fragrance-growth",
  "creator-wrapup": "fragrance-creator-wrapup",
  "platform-release-gate": "platform-mobile-release",
  "factory-pvt-gate": "factory-pilot-ramp",
  "service-incident": "service-incident-recovery",
};

const withoutLegacySyntheticTaskMeta = (meta: string) => {
  const cleaned = meta.replace(/^本地合成任务(?:\s*·\s*)?/, "").trim();
  return cleaned || "时间待确认";
};

function withResponsibilityEvidenceTaskIds(state: PersonalCenterState): PersonalCenterState {
  return {
    ...state,
    teams: state.teams.map((team) => ({
      ...team,
      observedClaims: team.observedClaims.map((claim) => ({
        ...claim,
        evidence: claim.evidence?.map((evidence) => ({
          ...evidence,
          meta: withoutLegacySyntheticTaskMeta(evidence.meta),
          taskId: evidence.taskId ?? responsibilityEvidenceTaskIds[evidence.id],
        })),
      })),
    })),
  };
}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isResponsibilityProposal = (value: unknown): value is ResponsibilityProposal => {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const proposal = value as { baseRevisionId?: string; operation?: "add" | "update"; target?: { expectedText?: string; paragraphIndex?: number } };
  if (!isText(proposal.baseRevisionId) || !["add", "update"].includes(proposal.operation ?? "")) return false;
  if (proposal.operation === "add") return !("target" in proposal);
  const target = proposal.target;
  return Boolean(target) && Number.isInteger(target?.paragraphIndex) && Number(target?.paragraphIndex) >= 0 && isText(target?.expectedText);
};
const isClaim = (value: unknown): value is ResponsibilityClaim => {
  if (!value || typeof value !== "object") return false;
  const claim = value as Partial<ResponsibilityClaim>;
  const validHistory = claim.changeHistory === undefined || (Array.isArray(claim.changeHistory) && claim.changeHistory.every((change) => Boolean(change) && isText(change.id) && isText(change.actor) && isText(change.at) && ["accepted", "corrected", "hidden", "disputed", "restored"].includes(change.action)
    && (change.appliedText === undefined || isText(change.appliedText))
    && (change.previousText === undefined || isText(change.previousText))
    && (change.resultRevisionId === undefined || isText(change.resultRevisionId))));
  const validCorrection = claim.correctedBySelf === true
    ? claim.kind === "observed" && isText(claim.originalLabel) && isText(claim.originalDescription)
    : (claim.correctedBySelf === undefined || claim.correctedBySelf === false) && claim.originalLabel === undefined && claim.originalDescription === undefined;
  return isText(claim.id) && isText(claim.label) && isText(claim.description) && isText(claim.sourceLabel) && isText(claim.updatedAt)
    && ["formal", "self-declared", "observed"].includes(claim.kind ?? "")
    && (claim.kind !== "observed" || (isText(claim.aiActor) && isText(claim.ruleVersion) && isText(claim.changeSetId)))
    && validCorrection
    && isResponsibilityProposal(claim.proposal)
    && (claim.reviewState === undefined || ["active", "accepted", "hidden", "disputed"].includes(claim.reviewState))
    && validHistory
    && (claim.evidence === undefined || (Array.isArray(claim.evidence) && claim.evidence.every((item) => isText(item?.id) && isText(item?.label) && isText(item?.meta) && (item.taskId === undefined || isText(item.taskId)))));
};

const isResponsibilityDocument = (value: unknown): value is ResponsibilityDocument => {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<ResponsibilityDocument>;
  return typeof document.content === "string" && isText(document.updatedAt) && isText(document.updatedBy) && isText(document.revisionId);
};

const isMembership = (value: unknown): value is TeamMembership => {
  if (!value || typeof value !== "object") return false;
  const membership = value as Partial<TeamMembership>;
  return isText(membership.id) && isText(membership.email)
    && ["admin", "member"].includes(membership.role ?? "")
    && ["active", "invited"].includes(membership.status ?? "")
    && (membership.memberId === undefined || isText(membership.memberId))
    && (membership.invitedAt === undefined || isText(membership.invitedAt))
    && (membership.name === undefined || isText(membership.name))
    && (membership.emailInvitation === undefined || (isText(membership.emailInvitation.token)
      && isText(membership.emailInvitation.inviter) && Number.isFinite(membership.emailInvitation.createdAt)
      && Number.isFinite(membership.emailInvitation.expiresAt) && membership.emailInvitation.delivery === "preview"))
    && (membership.responsibility === undefined || typeof membership.responsibility === "string");
};

const isTeamCore = (team: Partial<TeamResponsibilityProfile>) => Boolean(team)
  && isText(team.id) && isText(team.name) && isText(team.role) && isText(team.coverage) && isText(team.missingSources) && isText(team.lastSyncedAt)
  && (team.responsibilityAutoUpdate === undefined || typeof team.responsibilityAutoUpdate === "boolean")
  && isResponsibilityDocument(team.responsibilityDocument)
  && Array.isArray(team.observedClaims) && team.observedClaims.every((claim) => isClaim(claim) && claim.kind === "observed");

export function isPersonalCenterState(value: unknown): value is PersonalCenterState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PersonalCenterState>;
  const profile = state.profile;
  if (!profile || !isText(profile.name) || !isText(profile.email) || !isText(profile.title) || !isText(profile.timezone) || typeof profile.bio !== "string") return false;
  if (profile.avatarDataUrl !== undefined && (typeof profile.avatarDataUrl !== "string" || !profile.avatarDataUrl.startsWith("data:image/"))) return false;
  return Array.isArray(state.teams) && state.teams.length > 0 && state.teams.every((team) => isTeamCore(team)
    && isText(team.inviteToken)
    && Array.isArray(team.memberships) && team.memberships.length > 0 && team.memberships.every(isMembership)
    && team.memberships.some((membership) => membership.status === "active" && membership.role === "admin"));
}

function withLegacyProposalMetadata(state: PersonalCenterState): PersonalCenterState {
  return {
    ...state,
    teams: state.teams.map((team) => {
      return {
        ...team,
        observedClaims: team.observedClaims.map((claim) => {
          if (claim.proposal) return claim;
          // Before v6 every accepted suggestion meant "append". Keep that legacy
          // meaning explicit instead of guessing that a known claim is now an update.
          return { ...claim, proposal: { baseRevisionId: team.responsibilityDocument.revisionId, operation: "add" } };
        }),
      };
    }),
  };
}

function migrateV5State(value: unknown): PersonalCenterState | null {
  if (!isPersonalCenterState(value)) return null;
  return withLegacyProposalMetadata(value);
}

function migrateV4State(value: unknown): PersonalCenterState | null {
  if (!isPersonalCenterState(value)) return null;
  const fixture = cloneInitialState();
  const oldById = new Map(value.teams.map((team) => [team.id, team]));
  const teams = fixture.teams.map((seed) => {
    const previous = oldById.get(seed.id);
    if (!previous) return seed;
    const membershipsById = new Map(seed.memberships.map((membership) => [membership.id, membership]));
    previous.memberships.forEach((membership) => membershipsById.set(membership.id, membership));
    return { ...seed, ...previous, inviteToken: previous.inviteToken || seed.inviteToken, memberships: [...membershipsById.values()] };
  });
  for (const previous of value.teams) if (!teams.some((team) => team.id === previous.id)) teams.push(previous);
  const migrated = { profile: value.profile, teams };
  return isPersonalCenterState(migrated) ? migrated : null;
}

function migrateV3State(value: unknown): PersonalCenterState | null {
  if (!isPersonalCenterState(value)) return null;
  const fixture = cloneInitialState();
  return migrateV4State({
    profile: {
      ...value.profile,
      title: fixture.profile.title,
      bio: fixture.profile.bio,
    },
    teams: [fixture.teams[0], ...value.teams.filter((team) => team.id !== "retail" && team.id !== "creator-commerce")],
  });
}

type LegacyV2State = {
  profile?: PersonalCenterState["profile"];
  teams?: Array<Omit<TeamResponsibilityProfile, "inviteToken" | "memberships">>;
};

function migrateV2State(value: unknown): PersonalCenterState | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as LegacyV2State;
  if (!legacy.profile || !isText(legacy.profile.name) || !isText(legacy.profile.email) || !isText(legacy.profile.title) || !isText(legacy.profile.timezone) || typeof legacy.profile.bio !== "string" || !Array.isArray(legacy.teams)) return null;
  if (!legacy.teams.every((team) => isTeamCore(team))) return null;
  const migrated = { profile: legacy.profile, teams: legacy.teams.map((team) => ({ ...team, ...teamSettingsFixture(team.id) })) };
  return isPersonalCenterState(migrated) ? migrateV4State(migrated) : null;
}

function migrateLegacyState(value: unknown): PersonalCenterState | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as { profile?: PersonalCenterState["profile"]; teams?: Array<TeamResponsibilityProfile & { formalClaims?: ResponsibilityClaim[]; selfDeclaredClaims?: ResponsibilityClaim[] }> };
  if (!legacy.profile || !Array.isArray(legacy.teams)) return null;
  const teams = legacy.teams.map((team) => {
    const formalClaims = Array.isArray(team.formalClaims) ? team.formalClaims : [];
    const selfDeclaredClaims = Array.isArray(team.selfDeclaredClaims) ? team.selfDeclaredClaims : [];
    const claims = [...formalClaims, ...selfDeclaredClaims];
    if (!isText(team.id) || !isText(team.name) || !isText(team.role) || !isText(team.coverage) || !isText(team.missingSources) || !isText(team.lastSyncedAt)
      || !formalClaims.every((claim) => isClaim(claim) && claim.kind === "formal")
      || !selfDeclaredClaims.every((claim) => isClaim(claim) && claim.kind === "self-declared")
      || !Array.isArray(team.observedClaims) || !team.observedClaims.every((claim) => isClaim(claim) && claim.kind === "observed")) return null;
    return {
      id: team.id,
      name: team.name,
      role: team.role,
      coverage: team.coverage,
      missingSources: team.missingSources,
      lastSyncedAt: team.lastSyncedAt,
      ...teamSettingsFixture(team.id),
      responsibilityDocument: {
        content: claims.map((claim) => `${claim.label}\n${claim.description}`).join("\n\n"),
        updatedAt: "从旧版导入",
        updatedBy: "旧版责任记录",
        revisionId: `RESP-MIGRATED-${team.id}`,
      },
      observedClaims: team.observedClaims,
    } satisfies TeamResponsibilityProfile;
  });
  if (teams.some((team) => team === null)) return null;
  const migrated = { profile: legacy.profile, teams: teams as TeamResponsibilityProfile[] };
  return isPersonalCenterState(migrated) ? migrateV4State(migrated) : null;
}

export function loadPersonalCenterDirectory(): PersonalCenterState {
  let stored: string | null;
  let legacyV5Stored: string | null;
  let legacyV4Stored: string | null;
  let legacyV3Stored: string | null;
  let legacyV2Stored: string | null;
  let legacyV1Stored: string | null;
  try {
    stored = localStorage.getItem(personalCenterStorageKey);
    legacyV5Stored = localStorage.getItem(legacyPersonalCenterV5StorageKey);
    legacyV4Stored = localStorage.getItem(legacyPersonalCenterV4StorageKey);
    legacyV3Stored = localStorage.getItem(legacyPersonalCenterV3StorageKey);
    legacyV2Stored = localStorage.getItem(legacyPersonalCenterV2StorageKey);
    legacyV1Stored = localStorage.getItem(legacyPersonalCenterV1StorageKey);
  } catch {
    return cloneInitialState();
  }
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (isPersonalCenterState(parsed)) return withResponsibilityEvidenceTaskIds(parsed);
    } catch {
      // Continue to the legacy snapshot before falling back to fixture data.
    }
  }
  if (legacyV5Stored) {
    try {
      const migrated = migrateV5State(JSON.parse(legacyV5Stored) as unknown);
      if (migrated) return withResponsibilityEvidenceTaskIds(migrated);
    } catch {
      // Continue to older snapshots before falling back to fixture data.
    }
  }
  if (legacyV4Stored) {
    try {
      const migrated = migrateV4State(JSON.parse(legacyV4Stored) as unknown);
      if (migrated) return withResponsibilityEvidenceTaskIds(withLegacyProposalMetadata(migrated));
    } catch {
      // Continue to older snapshots before falling back to fixture data.
    }
  }
  if (legacyV3Stored) {
    try {
      const migrated = migrateV3State(JSON.parse(legacyV3Stored) as unknown);
      if (migrated) return withResponsibilityEvidenceTaskIds(withLegacyProposalMetadata(migrated));
    } catch {
      // Continue to older snapshots before falling back to fixture data.
    }
  }
  if (legacyV2Stored) {
    try {
      const migrated = migrateV2State(JSON.parse(legacyV2Stored) as unknown);
      if (migrated) return withResponsibilityEvidenceTaskIds(withLegacyProposalMetadata(migrated));
    } catch {
      // Continue to the v1 snapshot before falling back to fixture data.
    }
  }
  if (!legacyV1Stored) return cloneInitialState();
  try {
    const migrated = migrateLegacyState(JSON.parse(legacyV1Stored) as unknown);
    if (!migrated) return cloneInitialState();
    return withResponsibilityEvidenceTaskIds(withLegacyProposalMetadata(migrated));
  } catch {
    return cloneInitialState();
  }
}

export function savePersonalCenterDirectory(state: PersonalCenterState): boolean {
  try {
    localStorage.setItem(personalCenterStorageKey, JSON.stringify(state));
    if (typeof window !== "undefined") window.dispatchEvent(new Event(personalCenterChangedEvent));
    return true;
  } catch {
    return false;
  }
}

export function loadPersonalCenterState(): PersonalCenterState {
  const directory = loadPersonalCenterDirectory();
  const session = readWorkspaceSession();
  if (!session) return directory;
  let profile: PersonalCenterState["profile"] = { name: session.name, email: session.email, title: "成员", timezone: "Asia/Shanghai", bio: "" };
  try {
    const stored = JSON.parse(localStorage.getItem(workspaceProfileKey(session.userId)) ?? "null");
    if (stored && isText(stored.name) && isText(stored.email) && isText(stored.title) && isText(stored.timezone) && typeof stored.bio === "string") profile = stored;
  } catch { /* Use the signed-in identity when no profile has been saved. */ }
  const teams = directory.teams.filter(team => team.memberships.some(member => member.status === "active" && member.memberId === session.userId));
  return { profile, teams: teams.map(team => ({ ...team, role: team.memberships.find(member => member.memberId === session.userId)?.role === "admin" ? "管理员" : "成员" })) };
}

export function savePersonalCenterState(state: PersonalCenterState): boolean {
  const session = readWorkspaceSession();
  if (!session) return savePersonalCenterDirectory(state);
  const directory = loadPersonalCenterDirectory();
  const ownIds = new Set(directory.teams.filter(team => team.memberships.some(member => member.status === "active" && member.memberId === session.userId)).map(team => team.id));
  const teams = directory.teams.filter(team => !ownIds.has(team.id));
  try {
    localStorage.setItem(workspaceProfileKey(session.userId), JSON.stringify(state.profile));
    return savePersonalCenterDirectory({ ...directory, teams: [...teams, ...state.teams] });
  } catch { return false; }
}
