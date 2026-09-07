import assert from "node:assert/strict";
import test from "node:test";
import { initialPersonalCenterState, isPersonalCenterState } from "../src/data/memberProfiles";
import { resolveTeamMemberResponsibility, updateTeamMemberResponsibility } from "../src/lib/teamMemberResponsibility";

test("personal center state accepts an optional team-scoped member responsibility", () => {
  const state = structuredClone(initialPersonalCenterState) as unknown as Record<string, any>;
  state.teams[0].memberships[0].responsibility = "负责项目结果";

  assert.equal(isPersonalCenterState(state), true);
  state.teams[0].memberships[0].responsibility = "";
  assert.equal(isPersonalCenterState(state), true);
  state.teams[0].memberships[0].responsibility = 1;
  assert.equal(isPersonalCenterState(state), false);
});

test("team responsibility override wins over the shared member profile", () => {
  assert.equal(
    resolveTeamMemberResponsibility({ responsibility: "团队覆盖" }, { dynamicResponsibility: "默认责任" }),
    "团队覆盖",
  );
  assert.equal(
    resolveTeamMemberResponsibility({ responsibility: "" }, { dynamicResponsibility: "默认责任" }),
    "未填写责任",
  );
  assert.equal(
    resolveTeamMemberResponsibility({}, { dynamicResponsibility: "默认责任" }),
    "默认责任",
  );
  assert.equal(resolveTeamMemberResponsibility({}, undefined), "加入后补充责任");
});

test("updating a member responsibility only changes the selected team membership", () => {
  const state = structuredClone(initialPersonalCenterState);
  const targetTeam = state.teams[0];
  const targetMembership = targetTeam.memberships[0];
  const untouchedTeam = state.teams[1];
  const result = updateTeamMemberResponsibility(state, targetTeam.id, targetMembership.id, "  新责任  ");

  assert.equal(result.changed, true);
  assert.equal(result.state.teams[0].memberships[0].responsibility, "新责任");
  assert.equal(result.state.teams[1], untouchedTeam);
  assert.equal(state.teams[0].memberships[0].responsibility, undefined);

  const missing = updateTeamMemberResponsibility(state, targetTeam.id, "missing", "不会保存");
  assert.equal(missing.changed, false);
  assert.equal(missing.state, state);
});
