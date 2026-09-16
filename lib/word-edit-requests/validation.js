export const MAX_WORD_EDIT_REQUEST_LENGTH = 1000;

export function validateWordEditRequestMessage(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      message: "",
      error: "수정 요청 내용을 입력해 주세요.",
    };
  }

  const message = value.trim();

  if (message.length > MAX_WORD_EDIT_REQUEST_LENGTH) {
    return {
      message,
      error: `수정 요청 내용은 ${MAX_WORD_EDIT_REQUEST_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  return { message, error: "" };
}
