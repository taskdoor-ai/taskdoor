import { mockWorkspaceEmail, mockWorkspacePasswordDigest, mockWorkspaceTeams } from "./mockWorkspaceAccount";
/** Interactive design preview only; this is not an authentication or authorization backend. */
import type { PersonalCenterState } from "../data/memberProfiles";
import { resolveTeamEmailInvitation } from "./teamInvitations";
export type AuthMode = "login" | "register" | "forgot";
export type OnboardingStep = "email" | "code" | "reset-password" | "choose" | "create" | "join" | "invite" | "workspace";
export type PreviewScenario = "new" | "invited" | "returning" | "expired";
export type PreviewTeam = { id: string; name: string; role: "admin" | "member" };
type PreviewAccount = { googleSubject?: string; name: string; passwordDigest: string; teams: PreviewTeam[]; activeTeamId: string };
export type OnboardingState = {
  mockAccessVersion?: number;
  registrationCode?: string;
  version: number;
  step: OnboardingStep; authMode: AuthMode; scenario: PreviewScenario;
  email: string; name: string; verified: boolean; codeExpiresAt: number;
  pendingPasswordDigest: string; inviteToken: string; teams: PreviewTeam[]; activeTeamId: string;
  error: string; errorField: string; notice: string; accounts: Record<string, PreviewAccount>;
};
export type OnboardingAction =
  | { type: "google-preview-complete"; email: string; name: string; subject: string }
  | { type: "request-registration-code"; email: string; code: string; now: number }
  | { type: "complete-registration"; name: string; email: string; passwordDigest: string; passwordLength: number; code: string; now: number }
  | { type: "auth-mode"; mode: AuthMode }
  | { type: "login"; email: string; passwordDigest: string }
  | { type: "register"; name: string; email: string; passwordDigest: string; passwordLength: number; now: number }
  | { type: "forgot-password"; email: string; now: number }
  | { type: "reset-password"; passwordDigest: string; passwordLength: number }
  | { type: "send-code"; now: number }
  | { type: "verify-code"; code: string; now: number }
  | { type: "choose"; step: "choose" | "create" | "join" }
  | { type: "create-team"; name: string; profileName?: string }
  | { type: "inspect-invite"; link: string }
  | { type: "accept-invite"; profileName?: string }
  | { type: "enter-team"; teamId: string }
  | { type: "switch-account" }
  | { type: "edit-email" }
  | { type: "clear-error" };

export const previewInviteLink = "https://agentdoor.local/t/ark/join/demo-valid";
export const previewDemoEmail = "zhoulan@example.com";
const previewVersion = 1;
const existingTeam: PreviewTeam = { id: "ark", name: "方舟产品团队", role: "member" };
const demoPasswordDigest = "37d97c1274f4b23c362c0d2d1c1f33a4e175e981d0bed32f3117773b978aaac2";
const validEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validDigest = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const normalizeEmail = (value: string) => value.trim().toLowerCase();
const defaultAccountName = (name: string, email: string) => name.trim() || email.split("@")[0].slice(0, 40);

// Avoid storing raw passwords in the preview's session storage. This local digest is not server authentication.
export async function digestPreviewPassword(password: string, email: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(`agentdoor-preview:${normalizeEmail(email)}`), iterations: 100000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function getPreviewCodeResendDelay(state: OnboardingState, now: number): number {
  if ((state.step !== "code" && !state.registrationCode) || !state.codeExpiresAt) return 0;
  return Math.min(60, Math.max(0, Math.ceil((state.codeExpiresAt - 540000 - now) / 1000)));
}
export function getPreviewInvitation(token: string, personalState?: PersonalCenterState) {
  const local = personalState ? resolveTeamEmailInvitation(personalState, token) : null;
  if (local) return local;
  const sharedTeam = token ? personalState?.teams.find(team => team.inviteToken === token) : undefined;
  if (sharedTeam) {
    const owner = sharedTeam.memberships.find(member => member.status === "active" && member.role === "admin");
    return { team: { id: sharedTeam.id, name: sharedTeam.name, role: "member" as const }, inviter: owner?.name || owner?.memberId || "团队管理员", status: "valid", email: "" };
  }
  if (!["demo-valid", "demo-expired", "demo-revoked", "demo-targeted"].includes(token)) return null;
  return { team: existingTeam, inviter: "周岚", status: token === "demo-expired" ? "expired" : token === "demo-revoked" ? "revoked" : "valid", email: token === "demo-targeted" ? "chen@example.com" : "" };
}
export function createOnboardingPreview(scenario: PreviewScenario = "new", inviteToken = ""): OnboardingState {
  return {
    mockAccessVersion: 1, version: previewVersion, scenario, step: "email", authMode: "login", email: scenario === "returning" ? previewDemoEmail : "", name: "",
    verified: false, codeExpiresAt: 0, pendingPasswordDigest: "",
    inviteToken: inviteToken || (scenario === "invited" ? "demo-valid" : scenario === "expired" ? "demo-expired" : ""),
    teams: [], activeTeamId: "", error: "", errorField: "", notice: "",
    accounts: { [mockWorkspaceEmail]: { name: "周岚", passwordDigest: mockWorkspacePasswordDigest, teams: mockWorkspaceTeams.map(team => ({ ...team })), activeTeamId: mockWorkspaceTeams[0].id }, [previewDemoEmail]: { name: "周岚", passwordDigest: demoPasswordDigest, teams: [], activeTeamId: "" } },
  };
}
function landing(state: OnboardingState, newlyRegistered = false): OnboardingStep {
  return state.inviteToken ? "invite" : state.teams.length ? "workspace" : newlyRegistered ? "create" : "choose";
}
function upgradeLegacyPreview(state: OnboardingState): OnboardingState {
  if (state.mockAccessVersion !== 1) {
    const previous = state.accounts[mockWorkspaceEmail];
    const teams = [...mockWorkspaceTeams.map(team => ({ ...team })), ...(previous?.teams ?? []).filter(team => !mockWorkspaceTeams.some(mock => mock.id === team.id))];
    state = { ...state, mockAccessVersion: 1, accounts: { ...state.accounts, [mockWorkspaceEmail]: {
      ...previous, name: previous?.name || "周岚", passwordDigest: mockWorkspacePasswordDigest, teams, activeTeamId: mockWorkspaceTeams[0].id,
    } } };
    if (state.verified && state.email === mockWorkspaceEmail) state = { ...state, teams, activeTeamId: mockWorkspaceTeams[0].id };
  }
  if (state.version === previewVersion) return state;
  // One-time migration: the demo account now represents a newly registered user.
  // Keep other preview accounts and all teams created after this migration.
  const demo = state.accounts[previewDemoEmail];
  let next: OnboardingState = {
    ...state, version: previewVersion,
    accounts: demo ? { ...state.accounts, [previewDemoEmail]: { ...demo, teams: [], activeTeamId: "" } } : state.accounts,
  };
  if (state.email === previewDemoEmail) next = { ...next, teams: [], activeTeamId: "", error: "", errorField: "" };
  if (next.verified && !next.teams.length && ["workspace", "choose"].includes(next.step)) next = { ...next, step: landing(next) };
  return next;
}
function rememberAccount(state: OnboardingState): OnboardingState {
  return { ...state, accounts: { ...state.accounts, [state.email]: { ...state.accounts[state.email], name: state.name, teams: state.teams, activeTeamId: state.activeTeamId } } };
}
export function transitionOnboarding(state: OnboardingState, action: OnboardingAction, personalState?: PersonalCenterState): OnboardingState {
  state = upgradeLegacyPreview(state);
  const clean = { error: "", errorField: "", notice: "" };
  const fail = (error: string, errorField = "") => ({ ...state, error, errorField, notice: "" });
  if (action.type === "clear-error") return { ...state, error: "", errorField: "" };
  if (action.type === "switch-account") return { ...createOnboardingPreview("new", state.inviteToken), accounts: state.accounts };
  if (action.type === "auth-mode") return { ...createOnboardingPreview("new", state.inviteToken), authMode: action.mode, email: state.email, accounts: state.accounts };
  if (action.type === "edit-email") return { ...state, registrationCode: undefined, step: "email", verified: false, codeExpiresAt: 0, pendingPasswordDigest: "", ...clean };
  if (action.type === "google-preview-complete") {
    // Local visual demo only. Never accepts a real Google token or makes a network request.
    if (state.step !== "email" || state.verified) return state;
    const email = normalizeEmail(action.email);
    if (!validEmail(email) || !action.subject.startsWith("demo-")) return fail("Google 验证未完成，请重试。");
    const account = state.accounts[email];
    if (account && account.googleSubject !== action.subject) return fail("该邮箱已有账号，请先使用原方式登录，再确认绑定 Google。");
    const profile = account ?? { name: defaultAccountName(action.name, email), passwordDigest: "", googleSubject: action.subject, teams: [], activeTeamId: "" };
    const next: OnboardingState = { ...state, email, name: profile.name, teams: profile.teams, activeTeamId: profile.activeTeamId,
      authMode: account ? "login" : "register", verified: true, pendingPasswordDigest: "", registrationCode: undefined, codeExpiresAt: 0,
      accounts: { ...state.accounts, [email]: profile }, ...clean };
    return { ...next, step: landing(next, !account) };
  }
  if (action.type === "request-registration-code") {
    if (state.step !== "email" || state.authMode !== "register" || state.verified) return state;
    const email = normalizeEmail(action.email);
    if (!validEmail(email)) return fail("请输入有效的邮箱地址。", "email");
    if (state.accounts[email]) return fail("该邮箱已注册，请直接登录。", "email");
    if (getPreviewCodeResendDelay(state, action.now) > 0) return state;
    return { ...state, email, registrationCode: "111111", codeExpiresAt: action.now + 600000, ...clean };
  }
  if (action.type === "complete-registration") {
    if (state.step !== "email" || state.authMode !== "register" || state.verified) return state;
    // Visual Mock only: no delivery, code matching, expiry or email binding.
    // Reuse account validation and the existing local account creation transaction.
    const prepared = transitionOnboarding(state, { ...action, type: "register" }, personalState);
    if (prepared.error || prepared.step !== "code") return prepared;
    const next = transitionOnboarding(prepared, { type: "verify-code", code: "111111", now: action.now }, personalState);
    return { ...next, registrationCode: undefined };
  }
  if (action.type === "login") {
    if (state.step !== "email" || state.verified) return state;
    const email = normalizeEmail(action.email);
    if (!validEmail(email)) return fail("请输入有效的邮箱地址。", "email");
    const account = state.accounts[email];
    if (!account || !validDigest(action.passwordDigest) || account.passwordDigest !== action.passwordDigest) return fail("邮箱或密码不正确，请重试。", "password");
    const nextState: OnboardingState = { ...state, name: defaultAccountName(account.name, email), teams: account.teams, activeTeamId: account.activeTeamId, email, verified: true, pendingPasswordDigest: "", ...clean };
    return { ...nextState, step: landing(nextState) };
  }
  if (action.type === "register") {
    if (state.step !== "email" || state.verified) return state;
    const email = normalizeEmail(action.email);
    const name = defaultAccountName(action.name, email);
    if (name.length > 40) return fail("请输入 1–40 个字的姓名。", "name");
    if (!validEmail(email)) return fail("请输入有效的邮箱地址。", "email");
    if (action.passwordLength < 8 || !validDigest(action.passwordDigest)) return fail("密码至少需要 8 位。", "password");
    if (state.accounts[email]) return fail("该邮箱已注册，请直接登录。", "email");
    return { ...state, name, email, authMode: "register", step: "code", pendingPasswordDigest: action.passwordDigest, codeExpiresAt: action.now + 600000, ...clean };
  }
  if (action.type === "forgot-password") {
    if (state.step !== "email" || state.verified) return state;
    const email = normalizeEmail(action.email);
    if (!validEmail(email)) return fail("请输入有效的邮箱地址。", "email");
    return { ...state, email, authMode: "forgot", step: "code", pendingPasswordDigest: "", codeExpiresAt: action.now + 600000, ...clean };
  }
  if (action.type === "send-code") {
    if (state.step !== "code" || getPreviewCodeResendDelay(state, action.now) > 0) return state;
    return { ...state, codeExpiresAt: action.now + 600000, ...clean };
  }
  if (action.type === "verify-code") {
    if (state.step !== "code") return state;
    // This local preview accepts any six digits without issuing or expiring a code.
    if (!/^\d{6}$/.test(action.code)) return fail("请输入 6 位数字验证码。", "code");
    if (state.authMode === "forgot") return state.accounts[state.email] ? { ...state, step: "reset-password", codeExpiresAt: 0, ...clean } : fail("无法验证此邮箱，请检查邮箱后重试。", "code");
    if (state.authMode !== "register" || !validDigest(state.pendingPasswordDigest)) return state;
    const next: OnboardingState = { ...state, verified: true, codeExpiresAt: 0, pendingPasswordDigest: "", accounts: { ...state.accounts, [state.email]: { name: state.name, passwordDigest: state.pendingPasswordDigest, teams: [], activeTeamId: "" } }, ...clean };
    return { ...next, step: landing(next, true) };
  }
  if (action.type === "reset-password") {
    if (state.step !== "reset-password" || state.authMode !== "forgot" || !state.accounts[state.email]) return state;
    if (action.passwordLength < 8 || !validDigest(action.passwordDigest)) return fail("密码至少需要 8 位。", "password");
    return { ...state, step: "email", authMode: "login", verified: false, accounts: { ...state.accounts, [state.email]: { ...state.accounts[state.email], passwordDigest: action.passwordDigest } }, ...clean, notice: "密码已更新，请重新登录。" };
  }
  if (!state.verified) return state;
  if (action.type === "create-team" || action.type === "accept-invite") {
    const profileName = state.name || action.profileName?.trim() || "";
    if (!profileName || profileName.length > 40) return fail("请输入 1–40 个字的姓名。", "name");
    state = { ...state, name: profileName };
  }
  if (action.type === "choose") return { ...state, step: action.step, ...clean };
  if (action.type === "create-team") {
    if (state.step !== "create") return state;
    const name = action.name.trim();
    if (!name || name.length > 40) return fail("请输入 1–40 个字的团队名称。", "team");
    const team: PreviewTeam = { id: `preview-team-${crypto.randomUUID()}`, name, role: "admin" };
    return rememberAccount({ ...state, step: "workspace", teams: [...state.teams, team], activeTeamId: team.id, inviteToken: "", ...clean });
  }
  if (action.type === "inspect-invite") {
    try {
      const url = new URL(action.link.trim());
      const match = url.pathname.match(/^\/t\/([^/]+)\/join\/([^/]+)\/?$/);
      const token = match?.[2] ?? (["/signup", "/login", "/onboarding"].includes(url.pathname) ? url.searchParams.get("invite") : null);
      const invitation = token ? getPreviewInvitation(token, personalState) : null;
      const allowedOrigin = url.origin === "https://agentdoor.local" || (typeof window !== "undefined" && url.origin === window.location.origin);
      if (!allowedOrigin || !token || !invitation || (match && match[1] !== invitation.team.id)) return fail("无法识别这份邀请，请向团队管理员确认链接。", "invite");
      return { ...state, step: "invite", inviteToken: token, ...clean };
    } catch { return fail("请输入完整的有效邀请链接。", "invite"); }
  }
  if (action.type === "accept-invite") {
    if (state.step !== "invite") return state;
    const invitation = getPreviewInvitation(state.inviteToken, personalState);
    if (!invitation) return fail("邀请不存在，请向管理员获取新链接。");
    if (invitation.status === "expired") return fail("邀请已过期，请向管理员获取新链接。");
    if (invitation.status === "revoked") return fail("邀请已撤销，请向管理员获取新链接。");
    if (invitation.email && invitation.email !== state.email) return fail("当前邮箱与受邀邮箱不符，请切换账号。");
    const teams = state.teams.some(team => team.id === invitation.team.id) ? state.teams : [...state.teams, invitation.team];
    return rememberAccount({ ...state, step: "workspace", teams, activeTeamId: invitation.team.id, inviteToken: "", ...clean });
  }
  if (action.type === "enter-team" && state.teams.some(team => team.id === action.teamId)) return rememberAccount({ ...state, step: "workspace", activeTeamId: action.teamId, inviteToken: "", ...clean });
  return state;
}

function isTeamList(value: unknown): value is PreviewTeam[] {
  return Array.isArray(value) && value.every(team => team && typeof team.id === "string" && typeof team.name === "string" && ["admin", "member"].includes(team.role));
}
export function restoreOnboardingPreview(raw: string | null): OnboardingState | null {
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as OnboardingState;
    if (!state || (state.version !== undefined && state.version !== previewVersion) || !["email", "code", "reset-password", "choose", "create", "join", "invite", "workspace"].includes(state.step)
      || !["login", "register", "forgot"].includes(state.authMode) || !["new", "invited", "returning", "expired"].includes(state.scenario)
      || [state.email, state.name, state.inviteToken, state.activeTeamId, state.error, state.errorField, state.notice, state.pendingPasswordDigest].some(value => typeof value !== "string")
      || typeof state.verified !== "boolean" || !Number.isFinite(state.codeExpiresAt) || !isTeamList(state.teams)
      || !state.accounts || typeof state.accounts !== "object" || Array.isArray(state.accounts)
      || Object.values(state.accounts).some(account => !account || typeof account.name !== "string" || typeof account.activeTeamId !== "string" || !(validDigest(account.passwordDigest) || (account.passwordDigest === "" && typeof account.googleSubject === "string" && account.googleSubject.startsWith("demo-"))) || !isTeamList(account.teams))) return null;
    if (!["email", "code", "reset-password"].includes(state.step) && !state.verified) return null;
    if (state.step === "workspace" && !state.name) return null;
    if (state.step === "reset-password" && (state.authMode !== "forgot" || !state.accounts[state.email])) return null;
    if (state.step === "workspace" && !state.teams.some(team => team.id === state.activeTeamId)) return null;
    const restored = upgradeLegacyPreview(state);
    if (restored.verified && restored.authMode === "register" && !restored.name && !restored.teams.length && restored.step === "choose") return { ...restored, step: landing(restored, true) };
    return restored;
  } catch { return null; }
}

/** Skip legacy team setup screens in the current sign-in experience. */
export function simplifyOnboardingEntry(state: OnboardingState): OnboardingState {
  if (!state.verified || state.error) return state;
  const name = defaultAccountName(state.name, state.email);
  if (state.inviteToken) return rememberAccount({ ...state, name, step: "invite" });
  const teams: PreviewTeam[] = state.teams.length ? state.teams : [{
    id: `personal-${encodeURIComponent(state.email)}`, name, role: "admin",
  }];
  const activeTeamId = teams.some(team => team.id === state.activeTeamId) ? state.activeTeamId : teams[0].id;
  return rememberAccount({ ...state, name, teams, activeTeamId, step: "workspace" });
}
