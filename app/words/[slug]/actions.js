"use server";

import { refresh } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { savePersonalMemo, deletePersonalMemo } from "@/lib/memos/data";
import { validateMemoContent } from "@/lib/memos/validation";
import { findWordBySlug } from "@/lib/words/data";

export async function saveMemo(slug, previousState, formData) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      type: "error",
      message: "로그인 후 메모를 작성해 주세요.",
      submittedAt: Date.now(),
    };
  }

  if (session.user.role !== "user") {
    return {
      type: "error",
      message: "일반 사용자만 개인 메모를 작성할 수 있습니다.",
      submittedAt: Date.now(),
    };
  }

  const validation = validateMemoContent(formData.get("content"));

  if (validation.error) {
    return {
      type: "error",
      message: validation.error,
      submittedAt: Date.now(),
    };
  }

  const word = await findWordBySlug(slug);

  if (!word) {
    return {
      type: "error",
      message: "메모할 단어를 찾을 수 없습니다.",
      submittedAt: Date.now(),
    };
  }

  try {
    const result = await savePersonalMemo({
      userId: session.user.id,
      wordId: word._id.toString(),
      content: validation.content,
    });

    refresh();

    return {
      type: "success",
      message: result.created
        ? "메모가 저장되었습니다."
        : "메모가 수정되었습니다.",
      submittedAt: Date.now(),
    };
  } catch (error) {
    console.error("개인 메모 저장 실패:", error);

    return {
      type: "error",
      message: "메모를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      submittedAt: Date.now(),
    };
  }
}

export async function deleteMemo(slug) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "user") return { type: "error", message: "일반 사용자로 로그인해 주세요." };
  const word = await findWordBySlug(slug);
  if (!word) return { type: "error", message: "단어를 찾을 수 없습니다." };
  try {
    await deletePersonalMemo({ userId: session.user.id, wordId: word._id.toString() });
    refresh();
    return { type: "success", message: "메모가 삭제되었습니다." };
  } catch {
    return { type: "error", message: "메모를 삭제하지 못했습니다. 다시 시도해 주세요." };
  }
}
