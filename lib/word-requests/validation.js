export const MAX_REQUESTED_WORD_LENGTH = 100;

export function validateRequestedWord(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      requestedWord: "",
      normalizedWord: "",
      error: "요청할 단어를 입력해 주세요.",
    };
  }

  const requestedWord = value.trim();

  if (requestedWord.length > MAX_REQUESTED_WORD_LENGTH) {
    return {
      requestedWord,
      normalizedWord: requestedWord.toLowerCase(),
      error: `요청할 단어는 ${MAX_REQUESTED_WORD_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  return {
    requestedWord,
    normalizedWord: requestedWord.toLowerCase(),
    error: "",
  };
}
