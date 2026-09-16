"use server";

import { refresh } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  completeWordRequestGroup,
  findPendingRequestGroup,
  rejectWordRequestGroup,
} from "@/lib/word-requests/data";
import { rejectWordEditRequest } from "@/lib/word-edit-requests/data";
import {
  createWord,
  deleteWordBySlug,
  findWordByExactName,
  findWordBySlug,
} from "@/lib/words/data";
import { validateWordInput } from "@/lib/words/validation";

function actionResult(type, message) {
  return { type, message, submittedAt: Date.now() };
}

async function requireAdmin() {
  const session = await getCurrentSession();

  if (session?.user?.role !== "admin") {
    return null;
  }

  return session;
}

function validateReason(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { reason: "", error: "거절 사유를 입력해 주세요." };
  }

  const reason = value.trim();

  if (reason.length > 1000) {
    return { reason, error: "거절 사유는 1000자 이하로 입력해 주세요." };
  }

  return { reason, error: "" };
}

export async function createAdminWord(previousState, formData) {
  if (!(await requireAdmin())) {
    return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  }

  const validation = validateWordInput({
    name: formData.get("name"),
    meaning: formData.get("meaning"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    tags: formData.get("tags"),
    codeExample: formData.get("codeExample"),
    codeLanguage: formData.get("codeLanguage"),
  });

  if (validation.error) {
    return actionResult("error", validation.error);
  }

  const [sameSlugWord, sameNameWord] = await Promise.all([
    findWordBySlug(validation.word.slug),
    findWordByExactName(validation.word.name),
  ]);

  if (sameSlugWord || sameNameWord) {
    return actionResult("error", "같은 이름 또는 슬러그의 단어가 이미 있습니다.");
  }

  const normalizedWord = formData.get("requestNormalizedWord");
  if (typeof normalizedWord === "string" && normalizedWord && !(await findPendingRequestGroup(normalizedWord))) {
    return actionResult("error", "이미 처리된 요청입니다. 목록을 다시 확인해 주세요.");
  }

  try {
    const wordId = await createWord(validation.word);

    if (typeof normalizedWord === "string" && normalizedWord) {
      await completeWordRequestGroup({ normalizedWord, wordId });
    }

    refresh();

    return actionResult("success", "단어가 등록되었습니다.");
  } catch (error) {
    if (error?.code === 11000) {
      return actionResult("error", "같은 슬러그의 단어가 이미 있습니다.");
    }

    console.error("관리자 단어 등록 실패:", error);
    return actionResult(
      "error",
      "단어를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}

export async function rejectAdminWordRequests(
  normalizedWord,
  previousState,
  formData
) {
  if (!(await requireAdmin())) {
    return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  }

  if (typeof normalizedWord !== "string" || !normalizedWord) {
    return actionResult("error", "처리할 요청을 찾을 수 없습니다.");
  }

  const validation = validateReason(formData.get("reason"));

  if (validation.error) {
    return actionResult("error", validation.error);
  }

  const updatedCount = await rejectWordRequestGroup({
    normalizedWord,
    reason: validation.reason,
  });

  if (updatedCount === 0) {
    return actionResult("error", "처리 중인 요청을 찾을 수 없습니다.");
  }

  refresh();
  return actionResult("success", "요청이 거절되었습니다.");
}

export async function rejectAdminWordEditRequest(
  requestId,
  previousState,
  formData
) {
  if (!(await requireAdmin())) {
    return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  }

  const validation = validateReason(formData.get("reason"));

  if (validation.error) {
    return actionResult("error", validation.error);
  }

  const rejected = await rejectWordEditRequest({
    requestId,
    reason: validation.reason,
  });

  if (!rejected) {
    return actionResult("error", "처리 중인 요청을 찾을 수 없습니다.");
  }

  refresh();
  return actionResult("success", "요청이 거절되었습니다.");
}

export async function deleteRegisteredWord(slug) {
  if (!(await requireAdmin())) return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  if (!(await findWordBySlug(slug))) return actionResult("error", "삭제할 단어를 찾을 수 없습니다.");
  try {
    await deleteWordBySlug(slug);
    refresh();
    return actionResult("success", "단어가 삭제되었습니다.");
  } catch {
    return actionResult("error", "단어를 삭제하지 못했습니다.");
  }
}
