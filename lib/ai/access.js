export function canUseAiQuiz(user) {
  return user?.role === "user";
}
