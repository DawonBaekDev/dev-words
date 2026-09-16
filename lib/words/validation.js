import { CODE_LANGUAGE_LABELS, WORD_CATEGORIES } from "./search.js";

export const MAX_WORD_NAME_LENGTH = 100;
export const MAX_WORD_MEANING_LENGTH = 300;
export const MAX_WORD_DESCRIPTION_LENGTH = 1000;
export const MAX_WORD_CODE_LENGTH = 5000;

function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidWordMeaning(meaning) {
  const meaningParts = meaning.split(" : ");

  return (
    meaningParts.length === 2 &&
    meaningParts.every((meaningPart) => meaningPart.trim().length > 0)
  );
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function validateWordInput(input = {}) {
  const word = {
    name: readText(input.name),
    meaning: readText(input.meaning),
    slug: readText(input.slug),
    description: readText(input.description),
    category: readText(input.category),
    tags: normalizeTags(input.tags),
    codeExample: readText(input.codeExample),
    codeLanguage: readText(input.codeLanguage),
  };

  if (!word.name) {
    return { word, error: "단어 이름을 입력해 주세요." };
  }

  if (word.name.length > MAX_WORD_NAME_LENGTH) {
    return {
      word,
      error: `단어 이름은 ${MAX_WORD_NAME_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  if (!word.meaning || !isValidWordMeaning(word.meaning)) {
    return {
      word,
      error: '직역 의미는 "영어 원어 : 한국어 뜻" 형식으로 입력해 주세요.',
    };
  }

  if (word.meaning.length > MAX_WORD_MEANING_LENGTH) {
    return {
      word,
      error: `직역 의미는 ${MAX_WORD_MEANING_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  if (!/^[a-z0-9-]+$/.test(word.slug)) {
    return {
      word,
      error: "슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.",
    };
  }

  if (!word.description) {
    return { word, error: "단어 설명을 입력해 주세요." };
  }

  if (word.description.length > MAX_WORD_DESCRIPTION_LENGTH) {
    return {
      word,
      error: `단어 설명은 ${MAX_WORD_DESCRIPTION_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  if (!WORD_CATEGORIES.includes(word.category)) {
    return { word, error: "올바른 카테고리를 선택해 주세요." };
  }

  if (!word.codeExample) {
    return { word, error: "코드 예시를 입력해 주세요." };
  }

  if (word.codeExample.length > MAX_WORD_CODE_LENGTH) {
    return {
      word,
      error: `코드 예시는 ${MAX_WORD_CODE_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  if (!Object.hasOwn(CODE_LANGUAGE_LABELS, word.codeLanguage)) {
    return { word, error: "올바른 코드 언어를 선택해 주세요." };
  }

  return { word, error: "" };
}
