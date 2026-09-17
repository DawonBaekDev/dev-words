"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { saveQuizMemo } from "@/lib/ai/data";

async function getQuizNoteUser() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.role !== "user") redirect("/");
  return session.user;
}

export async function saveQuizMemoAction(quizId, formData) {
  const user = await getQuizNoteUser();
  const value = formData.get("memo");
  if (typeof value !== "string" || !value.trim() || value.trim().length > 1000) {
    redirect("/mypage?tab=quiz&quizMemoError=invalid#quiz-notes");
  }

  const saved = await saveQuizMemo({ quizId, userId: user.id, content: value.trim() });
  if (!saved) redirect("/mypage?tab=quiz&quizMemoError=missing#quiz-notes");
  revalidatePath("/mypage");
}

export async function deleteQuizMemoAction(quizId) {
  const user = await getQuizNoteUser();
  const saved = await saveQuizMemo({ quizId, userId: user.id, content: "" });
  if (!saved) redirect("/mypage?tab=quiz&quizMemoError=missing#quiz-notes");
  revalidatePath("/mypage");
}
