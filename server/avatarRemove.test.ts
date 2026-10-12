import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the avatar overlay shows remove beside edit only when an image is uploaded", () => {
  const actions = read("src/shared/ui/AvatarEditActions.tsx");
  assert.match(actions, /aria-label=\{m\('chooseAnAvatarImage'\)\}/);
  assert.match(actions, /\{onRemove && <button aria-label=\{m\('removeAvatar'\)\}/);

  const personal = read("src/app/workspace/components/PersonalInfoDialog.tsx");
  assert.match(personal, /onRemove=\{draft\.avatarDataUrl \? \(\) => \{[^}]*setDraft\(\(\{ avatarDataUrl: _removed, \.\.\.current \}\) => current\)/);

  const team = read("src/features/members/components/TeamAppearancePicker.tsx");
  assert.match(team, /onRemove=\{current\.avatarDataUrl \? \(\) => \{[^}]*onChange\(\{ iconTone: current\.iconTone \}\)/);
});

test("both avatar editors reveal the overlay on hover and keyboard focus", () => {
  assert.match(read("src/shared/styles/personal-center.css"), /\.personal-avatar-choice:focus-within \.avatar-edit-overlay/);
  assert.match(read("src/features/members/styles/team-appearance.css"), /\.team-appearance-trigger:focus-within \.avatar-edit-overlay/);
});
