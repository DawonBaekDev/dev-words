import assert from "node:assert/strict";
import test from "node:test";
import { validateAiQuizOutput, validateAiWordOutput, validateQuizAnswers } from "../lib/ai/validation.js";

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
      difficulty: "하",
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
    "하"
  );

  assert.equal(result.error, "");
  assert.equal(result.quiz.questions.length, 3);
});


test("미선택 답안과 빈 답안을 0번 선택지로 채점하지 않는다", () => {
  const form = new FormData();
  for (let index = 0; index < 2; index++) form.set(`answer-${index}`, "0");
  assert.ok(validateQuizAnswers(form).error);
  form.set("answer-2", "");
  assert.ok(validateQuizAnswers(form).error);
  form.set("answer-2", "4");
  assert.ok(validateQuizAnswers(form).error);
  form.set("answer-2", "3");
  assert.deepEqual(validateQuizAnswers(form).answers, [0, 0, 3]);
});

test("3문제 퀴즈의 단어 중복, 허용되지 않은 단어, 공백만 다른 선택지를 거절한다", () => {
  const ids = ["1", "2", "3"];
  const makeQuiz = () => ({ difficulty: "상", questions: ids.map((wordId) => ({
    wordId, question: "질문", choices: ["가", "나", "다", "라"], correctChoiceIndex: 1, explanation: "설명",
  })) });
  assert.equal(validateAiQuizOutput(makeQuiz(), ids, "상").error, "");
  const duplicate = makeQuiz(); duplicate.questions[1].wordId = "1";
  assert.ok(validateAiQuizOutput(duplicate, ids, "상").error);
  const unknown = makeQuiz(); unknown.questions[0].wordId = "6";
  assert.ok(validateAiQuizOutput(unknown, ids, "상").error);
  const choices = makeQuiz(); choices.questions[0].choices = ["가", " 가 ", "다", "라"];
  assert.ok(validateAiQuizOutput(choices, ids, "상").error);
  const short = makeQuiz(); short.questions.pop();
  assert.ok(validateAiQuizOutput(short, ids, "상").error);
});
