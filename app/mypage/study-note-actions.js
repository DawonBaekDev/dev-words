"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { deleteStudyNote, saveStudyNote } from "@/lib/study-calendar/data";
import { isValidDateKey } from "@/lib/study-calendar/date";

async function getStudyNoteUser() {
  const session = await getCurrentSession();
  if (session?.user?.role !== "user") redirect("/");
  return session.user;
}

function getCalendarUrl(dateKey, status = "") {
  const month = dateKey.slice(0, 7);
  const suffix = status ? `&${status}` : "";
  return `/mypage?tab=calendar&month=${month}&day=${dateKey}${suffix}#study-calendar`;
}

export async function saveStudyNoteAction(formData) {
  const user = await getStudyNoteUser();
  const dateKey = formData.get("dateKey");
  const content = formData.get("content");
  if (!isValidDateKey(dateKey)) redirect("/mypage?tab=calendar&error=date#study-calendar");
  if (typeof content !== "string" || !content.trim() || content.trim().length > 1500) {
    redirect(getCalendarUrl(dateKey, "error=content"));
  }

  await saveStudyNote({ userId: user.id, dateKey, content: content.trim() });
  revalidatePath("/mypage");
  redirect(getCalendarUrl(dateKey, "saved=1"));
}

export async function deleteStudyNoteAction(formData) {
  const user = await getStudyNoteUser();
  const dateKey = formData.get("dateKey");
  if (!isValidDateKey(dateKey)) redirect("/mypage?tab=calendar&error=date#study-calendar");

  await deleteStudyNote({ userId: user.id, dateKey });
  revalidatePath("/mypage");
  redirect(getCalendarUrl(dateKey, "deleted=1"));
}
