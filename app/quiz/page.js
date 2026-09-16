import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import QuizClient from "./quiz-client";
import { canUseAiQuiz } from "@/lib/ai/access";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata = {
  title: "AI 퀴즈",
};

export default async function QuizPage() {
  await connection();

  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/");
  }

  if (!canUseAiQuiz(session.user)) {
    redirect("/admin");
  }

  return (
    <main>
      <p><Link href="/mypage">← 마이페이지로</Link></p>
      <QuizClient />
    </main>
  );
}
