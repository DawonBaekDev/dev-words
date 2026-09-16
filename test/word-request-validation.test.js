import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_REQUESTED_WORD_LENGTH,
  validateRequestedWord,
} from "../lib/word-requests/validation.js";

test("비어 있거나 공백뿐인 새 단어 요청을 거절한다", () => {
  assert.deepEqual(validateRequestedWord("   "), {
    requestedWord: "",
    normalizedWord: "",
    error: "요청할 단어를 입력해 주세요.",
  });
});

test("새 단어 요청의 앞뒤 공백을 제거하고 영문을 소문자로 정규화한다", () => {
  assert.deepEqual(validateRequestedWord("  WebSocket  "), {
    requestedWord: "WebSocket",
    normalizedWord: "websocket",
    error: "",
  });
});

test("최대 길이를 넘는 새 단어 요청을 거절한다", () => {
  const requestedWord = "a".repeat(MAX_REQUESTED_WORD_LENGTH + 1);
  const result = validateRequestedWord(requestedWord);

  assert.equal(
    result.error,
    `요청할 단어는 ${MAX_REQUESTED_WORD_LENGTH}자 이하로 입력해 주세요.`
  );
});
