import assert from "node:assert/strict";
import test from "node:test";
import { validateWordEditRequestMessage } from "../lib/word-edit-requests/validation.js";

test("공백뿐인 수정 요청을 거절한다", () => {
  assert.deepEqual(validateWordEditRequestMessage("  "), {
    message: "",
    error: "수정 요청 내용을 입력해 주세요.",
  });
});

test("수정 요청의 앞뒤 공백을 제거한다", () => {
  assert.deepEqual(
    validateWordEditRequestMessage("  설명을 더 쉽게 바꿔 주세요.  "),
    {
      message: "설명을 더 쉽게 바꿔 주세요.",
      error: "",
    }
  );
});
