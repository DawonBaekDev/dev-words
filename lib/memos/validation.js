export function validateMemoContent(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      content: "",
      error: "메모 내용을 입력해 주세요.",
    };
  }

  return {
    content: value.trim(),
    error: "",
  };
}
