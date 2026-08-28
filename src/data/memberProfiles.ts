export type ResponsibilityEvidence = {
  id: string;
  label: string;
  meta: string;
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
  reviewState?: "active" | "accepted" | "hidden" | "disputed";
  changeHistory?: Array<{
    id: string;
    actor: string;
    action: "accepted" | "corrected" | "hidden" | "disputed" | "restored";
    at: string;
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
  email: string;
  id: string;
  invitedAt?: string;
  memberId?: string;
  role: TeamAccessRole;
  status: "active" | "invited";
};

export type TeamResponsibilityProfile = {
  id: string;
  name: string;
  role: string;
  coverage: string;
  missingSources: string;
  lastSyncedAt: string;
  inviteToken: string;
  memberships: TeamMembership[];
  responsibilityDocument: ResponsibilityDocument;
  observedClaims: ResponsibilityClaim[];
};

export type PersonalCenterState = {
  profile: {
    name: string;
    email: string;
    title: string;
    timezone: string;
    bio: string;
  };
  teams: TeamResponsibilityProfile[];
};

export const personalCenterStorageKey = "agentdoor-personal-center-v3";
const legacyPersonalCenterV2StorageKey = "agentdoor-personal-center-v2";
const legacyPersonalCenterV1StorageKey = "agentdoor-personal-center-v1";

const retailMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "retail-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "chenmo@agentdoor.local", id: "retail-member-chenmo", memberId: "陈默", role: "member", status: "active" },
  { email: "linjie@agentdoor.local", id: "retail-member-linjie", memberId: "林洁", role: "member", status: "active" },
  { email: "gaoyuan@agentdoor.local", id: "retail-member-gaoyuan", memberId: "高远", role: "member", status: "active" },
  { email: "liangchuan@agentdoor.local", id: "retail-member-liangchuan", memberId: "梁川", role: "member", status: "active" },
  { email: "xuning@agentdoor.local", id: "retail-member-xuning", memberId: "许宁", role: "member", status: "active" },
  { email: "hanxu@agentdoor.local", id: "retail-member-hanxu", memberId: "韩序", role: "member", status: "active" },
  { email: "suhe@agentdoor.local", id: "retail-member-suhe", memberId: "苏禾", role: "member", status: "active" },
];

const platformMemberships: TeamMembership[] = [
  { email: "zhoulan@agentdoor.local", id: "platform-member-zhoulan", memberId: "周岚", role: "admin", status: "active" },
  { email: "chenmo@agentdoor.local", id: "platform-member-chenmo", memberId: "陈默", role: "member", status: "active" },
  { email: "liangchuan@agentdoor.local", id: "platform-member-liangchuan", memberId: "梁川", role: "member", status: "active" },
  { email: "suhe@agentdoor.local", id: "platform-member-suhe", memberId: "苏禾", role: "member", status: "active" },
];

const teamSettingsFixture = (teamId: string) => ({
  inviteToken: teamId === "retail" ? "retail-6kfuzvtc" : teamId === "platform" ? "platform-4nq7h2ks" : `${teamId}-invite`,
  memberships: (teamId === "retail" ? retailMemberships : teamId === "platform" ? platformMemberships : []).map((membership) => ({ ...membership })),
});

export const initialPersonalCenterState: PersonalCenterState = {
  profile: {
    name: "周岚",
    email: "zhoulan@agentdoor.local",
    title: "交易产品负责人",
    timezone: "中国标准时间 · UTC+8",
    bio: "负责把复杂交易规则变成团队能够共同理解、验证和接续的决定。",
  },
  teams: [
    {
      id: "retail",
      name: "零售业务团队",
      role: "交易产品负责人",
      coverage: "覆盖最近 90 天 AgentDoor 内的任务、决定与文件评审。",
      missingSources: "未覆盖会议、邮件、线下沟通和外部项目系统。",
      lastSyncedAt: "今天 09:20",
      ...teamSettingsFixture("retail"),
      responsibilityDocument: {
        content: "负责退款、撤单、核销与会员结算规则的业务边界，并持续推动规则达成团队共识。\n\n参与跨产品、研发与运营的复杂规则澄清和有界决策，把业务风险转成可执行的灰度范围与结果判断。",
        updatedAt: "2026-08-18",
        updatedBy: "周岚",
        revisionId: "RESP-RETAIL-008",
      },
      observedClaims: [
        {
          id: "retail-observed-refund",
          kind: "observed",
          label: "退款与撤单规则确认",
          description: "平台证据显示，你持续承担异常交易恢复规则的确认与边界收敛。",
          sourceLabel: "AI 根据已确认结果更新",
          updatedAt: "今天 09:20",
          aiActor: "AgentDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-20260827-014",
          reviewState: "active",
          changeHistory: [],
          evidence: [
            { id: "refund-rule", label: "POS 优惠券核销业务规则 v3.2", meta: "已确认决定 · 2 天前" },
            { id: "coupon-review", label: "优惠券重复核销修复任务", meta: "任务结果记录 · 昨天" },
          ],
        },
        {
          id: "retail-observed-handoff",
          kind: "observed",
          label: "跨角色结果整合",
          description: "平台证据显示，你会把技术评审与门店灰度结果整合为下一步业务决定。",
          sourceLabel: "AI 根据已确认结果更新",
          updatedAt: "昨天 18:40",
          aiActor: "AgentDoor 责任观察 Agent",
          ruleVersion: "责任观察规则 v1.2",
          changeSetId: "CS-20260826-031",
          reviewState: "active",
          changeHistory: [],
          evidence: [
            { id: "gray-result", label: "门店灰度验证结论", meta: "结果交回并确认 · 昨天" },
          ],
        },
      ],
    },
    {
      id: "platform",
      name: "协作平台团队",
      role: "产品顾问",
      coverage: "仅覆盖本月 AgentDoor 内已确认的产品决定。",
      missingSources: "当前证据较少，未覆盖设计评审和外部研究记录。",
      lastSyncedAt: "昨天 16:10",
      ...teamSettingsFixture("platform"),
      responsibilityDocument: {
        content: "参与责任、交接与个人 Agent 协作边界的产品判断。\n\n关注 AI 主动性与人的决定权之间是否保持清楚边界，并协助团队把原则转成可验证的交互。",
        updatedAt: "2026-08-22",
        updatedBy: "周岚",
        revisionId: "RESP-PLATFORM-004",
      },
      observedClaims: [],
    },
  ],
};

const cloneInitialState = () => JSON.parse(JSON.stringify(initialPersonalCenterState)) as PersonalCenterState;

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isClaim = (value: unknown): value is ResponsibilityClaim => {
  if (!value || typeof value !== "object") return false;
  const claim = value as Partial<ResponsibilityClaim>;
  const validHistory = claim.changeHistory === undefined || (Array.isArray(claim.changeHistory) && claim.changeHistory.every((change) => Boolean(change) && isText(change.id) && isText(change.actor) && isText(change.at) && ["accepted", "corrected", "hidden", "disputed", "restored"].includes(change.action)));
  const validCorrection = claim.correctedBySelf === true
    ? claim.kind === "observed" && isText(claim.originalLabel) && isText(claim.originalDescription)
    : (claim.correctedBySelf === undefined || claim.correctedBySelf === false) && claim.originalLabel === undefined && claim.originalDescription === undefined;
  return isText(claim.id) && isText(claim.label) && isText(claim.description) && isText(claim.sourceLabel) && isText(claim.updatedAt)
    && ["formal", "self-declared", "observed"].includes(claim.kind ?? "")
    && (claim.kind !== "observed" || (isText(claim.aiActor) && isText(claim.ruleVersion) && isText(claim.changeSetId)))
    && validCorrection
    && (claim.reviewState === undefined || ["active", "accepted", "hidden", "disputed"].includes(claim.reviewState))
    && validHistory
    && (claim.evidence === undefined || (Array.isArray(claim.evidence) && claim.evidence.every((item) => isText(item?.id) && isText(item?.label) && isText(item?.meta))));
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
    && (membership.invitedAt === undefined || isText(membership.invitedAt));
};

const isTeamCore = (team: Partial<TeamResponsibilityProfile>) => Boolean(team)
  && isText(team.id) && isText(team.name) && isText(team.role) && isText(team.coverage) && isText(team.missingSources) && isText(team.lastSyncedAt)
  && isResponsibilityDocument(team.responsibilityDocument)
  && Array.isArray(team.observedClaims) && team.observedClaims.every((claim) => isClaim(claim) && claim.kind === "observed");

export function isPersonalCenterState(value: unknown): value is PersonalCenterState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PersonalCenterState>;
  const profile = state.profile;
  if (!profile || !isText(profile.name) || !isText(profile.email) || !isText(profile.title) || !isText(profile.timezone) || typeof profile.bio !== "string") return false;
  return Array.isArray(state.teams) && state.teams.length > 0 && state.teams.every((team) => isTeamCore(team)
    && isText(team.inviteToken)
    && Array.isArray(team.memberships) && team.memberships.length > 0 && team.memberships.every(isMembership)
    && team.memberships.some((membership) => membership.status === "active" && membership.role === "admin"));
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
  return isPersonalCenterState(migrated) ? migrated : null;
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
  return isPersonalCenterState(migrated) ? migrated : null;
}

export function loadPersonalCenterState(): PersonalCenterState {
  let stored: string | null;
  let legacyV2Stored: string | null;
  let legacyV1Stored: string | null;
  try {
    stored = localStorage.getItem(personalCenterStorageKey);
    legacyV2Stored = localStorage.getItem(legacyPersonalCenterV2StorageKey);
    legacyV1Stored = localStorage.getItem(legacyPersonalCenterV1StorageKey);
  } catch {
    return cloneInitialState();
  }
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as unknown;
      if (isPersonalCenterState(parsed)) return parsed;
    } catch {
      // Continue to the legacy snapshot before falling back to fixture data.
    }
  }
  if (legacyV2Stored) {
    try {
      const migrated = migrateV2State(JSON.parse(legacyV2Stored) as unknown);
      if (migrated) return migrated;
    } catch {
      // Continue to the v1 snapshot before falling back to fixture data.
    }
  }
  if (!legacyV1Stored) return cloneInitialState();
  try {
    const migrated = migrateLegacyState(JSON.parse(legacyV1Stored) as unknown);
    if (!migrated) return cloneInitialState();
    return migrated;
  } catch {
    return cloneInitialState();
  }
}

export function savePersonalCenterState(state: PersonalCenterState): boolean {
  try {
    localStorage.setItem(personalCenterStorageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
