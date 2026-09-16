"use client";

import Link from "next/link";

export default function QuizEntry({ isLoggedIn }) {
  if (isLoggedIn) {
    return <Link href="/quiz" className="button">AI 퀴즈 풀기 →</Link>;
  }

  return (
    <button type="button" onClick={() => document.getElementById("open-auth-dialog")?.click()}>
      로그인하고 퀴즈 풀기
    </button>
  );
}
