"use server";

import { refresh } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { savePendingWordEditRequest } from "@/lib/word-edit-requests/data";
import { validateWordEditRequestMessage } from "@/lib/word-edit-requests/validation";
import { findWordBySlug } from "@/lib/words/data";

export async function saveWordEditRequest(slug, previousState, formData) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      type: "error",
      message: "로그인 후 수정 요청을 작성해 주세요.",
      submittedAt: Date.now(),
    };
  }

  if (session.user.role !== "user") {
    return {
      type: "error",
      message: "일반 사용자만 수정 요청을 작성할 수 있습니다.",
      submittedAt: Date.now(),
    };
  }

  const validation = validateWordEditRequestMessage(formData.get("message"));

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
      message: "수정 요청할 단어를 찾을 수 없습니다.",
      submittedAt: Date.now(),
    };
  }

  try {
    const result = await savePendingWordEditRequest({
      userId: session.user.id,
      wordId: word._id.toString(),
      message: validation.message,
    });

    if (result.reason === "unchanged") {
      return {
        type: "success",
        message: "변경된 수정 요청 내용이 없습니다.",
        submittedAt: Date.now(),
      };
    }

    if (result.reason === "duplicate") {
      return {
        type: "error",
        message: "처리 중인 수정 요청이 있습니다. 다시 시도해 주세요.",
        submittedAt: Date.now(),
      };
    }

    refresh();

    return {
      type: "success",
      message: result.updated
        ? "수정 요청 내용이 수정되었습니다."
        : "수정 요청이 등록되었습니다.",
      submittedAt: Date.now(),
    };
  } catch (error) {
    console.error("수정 요청 저장 실패:", error);
    return {
      type: "error",
      message: "수정 요청을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      submittedAt: Date.now(),
    };
  }
}
