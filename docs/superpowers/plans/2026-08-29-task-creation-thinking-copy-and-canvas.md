# Task Creation Thinking Copy and Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all five task-creation shortcuts expose a credible four-step analysis, remove the composer progress streak, and restore the full right-panel gradient canvas.

**Architecture:** Derive workflow presentation data in `TaskCreationConversation.tsx` from the active request, generated draft, member records, and `peopleRecommendations`. Keep business assignment in the existing mock assistant, and limit CSS changes to the composer analyzing pseudo-element and task plan panel background.

**Tech Stack:** React, TypeScript, CSS, Node test runner, Vite.

---

### Task 1: Lock the visible workflow contract

**Files:**
- Modify: `server/agentDoorThinking.test.ts`
- Modify: `server/creatorCommerceVisibleCopy.test.ts`

- [ ] Add assertions for the four new step labels, dynamic use of people recommendations, match reasons, and structure/dependency summaries.
- [ ] Add assertions that the analyzing composer pseudo-element and keyframes are absent and the task panel has layered gradients.
- [ ] Run `npm test -- server/agentDoorThinking.test.ts server/creatorCommerceVisibleCopy.test.ts` and confirm the new assertions fail for the missing behavior.

### Task 2: Build the dynamic four-step workflow

**Files:**
- Modify: `src/components/TaskCreationConversation.tsx`

- [ ] Replace the static two-tool trace with four phases: target analysis, team context, people matching, and task structure.
- [ ] Derive completed people details from `peopleRecommendations`, member data, and generated owner assignments.
- [ ] Derive task structure details from the actual draft and dependency graph, with request-aware fallback copy while analysis is running.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Update the visual behavior

**Files:**
- Modify: `src/styles.css`

- [ ] Remove the analyzing composer sliding pseudo-element and unused keyframes.
- [ ] Change the task panel to a layered full-canvas gradient while keeping its child surfaces transparent.
- [ ] Run the focused tests and style contract checks.

### Task 4: Verify all five shortcuts and the build

**Files:**
- Verify: `src/lib/mockTaskAssistant.ts`
- Verify: `server/mockTaskAssistant.test.ts`

- [ ] Add or update a test that exercises all five shortcut prompts and checks their task counts and people recommendations.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Review the final diff and confirm no workspace/member fixtures outside task creation were changed.
