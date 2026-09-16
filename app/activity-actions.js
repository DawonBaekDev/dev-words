"use server";

import { ObjectId } from "mongodb";
import { refresh } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { findWordBySlug } from "@/lib/words/data";
import { saveFavorite, recordRecentWord, removeRecentWord } from "@/lib/activity/data";

export async function changeFavorite(slug, selected) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "user") return { type: "error", message: "일반 사용자로 로그인해 주세요." };
  if (typeof selected !== "boolean") return { type: "error", message: "잘못된 요청입니다." };
  const word = await findWordBySlug(slug);
  if (!word) return { type: "error", message: "단어를 찾을 수 없습니다." };
  try {
    await saveFavorite(session.user.id, word._id.toString(), selected);
    refresh();
    return { type: "success", message: selected ? "스크랩했습니다." : "스크랩을 해제했습니다." };
  } catch {
    return { type: "error", message: "스크랩을 저장하지 못했습니다. 다시 시도해 주세요." };
  }
}

export async function recordView(slug) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "user") return;
  const word = await findWordBySlug(slug);
  if (word) await recordRecentWord(session.user.id, word._id.toString());
}

export async function deleteRecentWord(wordId) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "user") return;
  if (wordId !== null && (typeof wordId !== "string" || !ObjectId.isValid(wordId))) return;
  await removeRecentWord(session.user.id, wordId);
  refresh();
}
