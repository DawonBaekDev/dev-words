import assert from "node:assert/strict";
import test from "node:test";
import { canUseAiQuiz } from "../lib/ai/access.js";

test("AI 퀴즈는 일반 사용자만 이용할 수 있다", () => {
  assert.equal(canUseAiQuiz({ role: "user" }), true);
  assert.equal(canUseAiQuiz({ role: "admin" }), false);
  assert.equal(canUseAiQuiz(null), false);
});
