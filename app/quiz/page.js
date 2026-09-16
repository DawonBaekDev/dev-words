import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import QuizClient from "./quiz-client";
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

  return (
    <main>
      <p><Link href={session.user.role === "admin" ? "/admin" : "/mypage"}>← 이전 페이지로</Link></p>
      <QuizClient />
    </main>
  );
}
