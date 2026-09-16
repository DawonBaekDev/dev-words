import assert from "node:assert/strict";
import test from "node:test";
import { validateMemoContent } from "../lib/memos/validation.js";

test("비어 있거나 공백뿐인 메모를 거절한다", () => {
  assert.deepEqual(validateMemoContent("   "), {
    content: "",
    error: "메모 내용을 입력해 주세요.",
  });
});

test("문자열이 아닌 메모 값을 거절한다", () => {
  assert.deepEqual(validateMemoContent(null), {
    content: "",
    error: "메모 내용을 입력해 주세요.",
  });
});

test("메모 앞뒤 공백을 제거하고 내용을 유지한다", () => {
  assert.deepEqual(validateMemoContent("  Hook의 상태 변경 함수  "), {
    content: "Hook의 상태 변경 함수",
    error: "",
  });
});
