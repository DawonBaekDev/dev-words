"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  completeWordEditRequest,
  findPendingWordEditRequestById,
} from "@/lib/word-edit-requests/data";
import {
  deleteWordBySlug,
  findWordByExactName,
  findWordBySlug,
  updateWordBySlug,
} from "@/lib/words/data";
import { validateWordInput } from "@/lib/words/validation";

function actionResult(type, message) {
  return { type, message, submittedAt: Date.now() };
}

async function requireAdmin() {
  const session = await getCurrentSession();
  return session?.user?.role === "admin";
}

export async function updateAdminWord(slug, previousState, formData) {
  if (!(await requireAdmin())) {
    return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  }

  const existingWord = await findWordBySlug(slug);

  if (!existingWord) {
    return actionResult("error", "수정할 단어를 찾을 수 없습니다.");
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

  const sameNameWord = await findWordByExactName(validation.word.name);

  if (sameNameWord && sameNameWord._id.toString() !== existingWord._id.toString()) {
    return actionResult("error", "같은 이름의 단어가 이미 있습니다.");
  }

  const sameSlugWord = await findWordBySlug(validation.word.slug);

  if (sameSlugWord && sameSlugWord._id.toString() !== existingWord._id.toString()) {
    return actionResult("error", "같은 슬러그의 단어가 이미 있습니다.");
  }

  const editRequestId = formData.get("editRequestId");

  if (typeof editRequestId === "string" && editRequestId) {
    const pendingRequest = await findPendingWordEditRequestById(
      editRequestId,
      existingWord._id.toString()
    );

    if (!pendingRequest) {
      return actionResult("error", "처리 중인 수정 요청을 찾을 수 없습니다.");
    }
  }

  let shouldRedirectToAdmin = false;

  try {
    await updateWordBySlug(slug, validation.word);

    if (typeof editRequestId === "string" && editRequestId) {
      await completeWordEditRequest({
        requestId: editRequestId,
        wordId: existingWord._id.toString(),
      });
      shouldRedirectToAdmin = true;
    }

  } catch (error) {
    console.error("관리자 단어 수정 실패:", error);
    return actionResult(
      "error",
      "단어를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }

  if (shouldRedirectToAdmin) {
    redirect("/admin");
  }

  refresh();
  return actionResult("success", "단어가 수정되었습니다.");
}

export async function deleteAdminWord(slug) {
  if (!(await requireAdmin())) {
    return actionResult("error", "관리자만 이용할 수 있는 기능입니다.");
  }

  const deleted = await deleteWordBySlug(slug);

  if (!deleted) {
    return actionResult("error", "삭제할 단어를 찾을 수 없습니다.");
  }

  redirect("/");
}
