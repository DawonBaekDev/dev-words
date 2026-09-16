import assert from "node:assert/strict";
import test from "node:test";
import { validateWordInput } from "../lib/words/validation.js";

const validWord = {
  name: "브랜치",
  meaning: "branch : 나무의 가지",
  slug: "branch",
  description: "Git에서 작업 흐름을 나누는 기능입니다.",
  category: "기타",
  tags: "Git, 작업 흐름",
  codeExample: "git branch",
  codeLanguage: "bash",
};

test("관리자 단어 입력의 태그를 배열로 정리한다", () => {
  const result = validateWordInput(validWord);

  assert.equal(result.error, "");
  assert.deepEqual(result.word.tags, ["Git", "작업 흐름"]);
});

test("직역 의미가 정해진 형식이 아니면 거절한다", () => {
  const result = validateWordInput({
    ...validWord,
    meaning: "나무의 가지",
  });

  assert.equal(
    result.error,
    '직역 의미는 "영어 원어 : 한국어 뜻" 형식으로 입력해 주세요.'
  );
});
