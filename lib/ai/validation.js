import { CODE_LANGUAGE_LABELS, WORD_CATEGORIES } from "../words/search.js";
import { validateWordInput } from "../words/validation.js";

const QUIZ_DIFFICULTIES = ["하", "중", "상"];

function hasOnlyKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const valueKeys = Object.keys(value);

  return (
    valueKeys.length === keys.length &&
    valueKeys.every((key) => keys.includes(key))
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}

export { QUIZ_DIFFICULTIES };

export function validateAiWordOutput(value) {
  const expectedKeys = [
    "name",
    "meaning",
    "slug",
    "description",
    "category",
    "tags",
    "codeExample",
    "codeLanguage",
  ];

  if (!hasOnlyKeys(value, expectedKeys)) {
    return { word: null, error: "AI_WORD_INVALID" };
  }

  if (!Array.isArray(value.tags) || !value.tags.every(isNonEmptyString)) {
    return { word: null, error: "AI_WORD_INVALID" };
  }

  if (!WORD_CATEGORIES.includes(value.category)) {
    return { word: null, error: "AI_WORD_INVALID" };
  }

  if (!Object.hasOwn(CODE_LANGUAGE_LABELS, value.codeLanguage)) {
    return { word: null, error: "AI_WORD_INVALID" };
  }

  const validation = validateWordInput(value);

  if (validation.error) {
    return { word: null, error: "AI_WORD_INVALID" };
  }

  return { word: validation.word, error: "" };
}

export function validateAiQuizOutput(value, wordIds, difficulty) {
  if (!QUIZ_DIFFICULTIES.includes(difficulty)) {
    return { quiz: null, error: "AI_QUIZ_INVALID" };
  }

  if (!hasOnlyKeys(value, ["difficulty", "questions"])) {
    return { quiz: null, error: "AI_QUIZ_INVALID" };
  }

  if (value.difficulty !== difficulty || !Array.isArray(value.questions)) {
    return { quiz: null, error: "AI_QUIZ_INVALID" };
  }

  if (value.questions.length !== 5) {
    return { quiz: null, error: "AI_QUIZ_INVALID" };
  }

  const selectedWordIds = new Set();
  const questions = [];

  for (const question of value.questions) {
    if (
      !hasOnlyKeys(question, [
        "wordId",
        "question",
        "choices",
        "correctChoiceIndex",
        "explanation",
      ]) ||
      !wordIds.includes(question.wordId) ||
      selectedWordIds.has(question.wordId) ||
      !isNonEmptyString(question.question) ||
      !isNonEmptyString(question.explanation) ||
      !Array.isArray(question.choices) ||
      question.choices.length !== 4 ||
      !question.choices.every(isNonEmptyString) ||
      new Set(question.choices.map((choice) => choice.trim())).size !== 4 ||
      !Number.isInteger(question.correctChoiceIndex) ||
      question.correctChoiceIndex < 0 ||
      question.correctChoiceIndex > 3
    ) {
      return { quiz: null, error: "AI_QUIZ_INVALID" };
    }

    selectedWordIds.add(question.wordId);
    questions.push({
      wordId: question.wordId,
      question: question.question.trim(),
      choices: question.choices.map((choice) => choice.trim()),
      correctChoiceIndex: question.correctChoiceIndex,
      explanation: question.explanation.trim(),
    });
  }

  return {
    quiz: {
      difficulty,
      questions,
    },
    error: "",
  };
}

export function validateQuizAnswers(formData) {
  const values = [0, 1, 2, 3, 4].map((index) => formData.get(`answer-${index}`));
  if (values.some((value) => typeof value !== "string" || !/^[0-3]$/.test(value))) {
    return { answers: null, error: "다섯 문제의 답을 모두 선택해 주세요." };
  }
  return { answers: values.map(Number), error: "" };
}
