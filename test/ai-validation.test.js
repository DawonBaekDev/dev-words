import assert from "node:assert/strict";
import test from "node:test";
import { validateAiQuizOutput, validateAiWordOutput } from "../lib/ai/validation.js";

test("AI 단어 출력에서 정의되지 않은 필드를 거절한다", () => {
  const result = validateAiWordOutput({
    name: "브랜치",
    meaning: "branch : 나무의 가지",
    slug: "branch",
    description: "Git에서 작업 흐름을 나누는 기능입니다.",
    category: "기타",
    tags: ["Git"],
    codeExample: "git branch",
    codeLanguage: "bash",
    unsafeField: "허용하면 안 되는 값",
  });

  assert.equal(result.error, "AI_WORD_INVALID");
});

test("AI 퀴즈 출력은 세 문제와 네 개의 서로 다른 선택지를 요구한다", () => {
  const result = validateAiQuizOutput(
    {
      difficulty: "초급",
      questions: [
        {
          wordId: "word-1",
          question: "HTTP는 무엇인가요?",
          choices: ["통신 규칙", "배열", "상태", "브랜치"],
          correctChoiceIndex: 0,
          explanation: "HTTP는 통신 규칙입니다.",
        },
        {
          wordId: "word-2",
          question: "Props는 무엇인가요?",
          choices: ["부모가 전달하는 데이터", "데이터베이스", "서버", "URL"],
          correctChoiceIndex: 0,
          explanation: "Props는 부모가 자식에게 전달합니다.",
        },
        {
          wordId: "word-3",
          question: "State는 무엇인가요?",
          choices: ["상태", "함수", "쿼리", "Git"],
          correctChoiceIndex: 0,
          explanation: "State는 컴포넌트가 기억하는 상태입니다.",
        },
      ],
    },
    ["word-1", "word-2", "word-3"],
    "초급"
  );

  assert.equal(result.error, "");
  assert.equal(result.quiz.questions.length, 3);
});
