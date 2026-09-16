"use server";

import { prepareRequestDraft } from "@/lib/word-requests/draft";
import { refresh } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createWordRequest,
  updatePendingWordRequest,
} from "@/lib/word-requests/data";
import { validateRequestedWord } from "@/lib/word-requests/validation";
import { updatePendingWordEditRequest } from "@/lib/word-edit-requests/data";
import { validateWordEditRequestMessage } from "@/lib/word-edit-requests/validation";
import { findWordByExactName } from "@/lib/words/data";

function actionResult(type, message) {
  return {
    type,
    message,
    submittedAt: Date.now(),
  };
}

async function validateGeneralUserRequest() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      session: null,
      error: actionResult("error", "로그인 후 단어를 요청해 주세요."),
    };
  }

  if (session.user.role !== "user") {
    return {
      session,
      error: actionResult(
        "error",
        "일반 사용자만 새 단어를 요청할 수 있습니다."
      ),
    };
  }

  return { session, error: null };
}

async function validateRequestForm(formData) {
  const validation = validateRequestedWord(formData.get("requestedWord"));

  if (validation.error) {
    return {
      validation,
      error: actionResult("error", validation.error),
    };
  }

  const existingWord = await findWordByExactName(validation.requestedWord);

  if (existingWord) {
    return {
      validation,
      error: actionResult("error", "이미 사전에 등록된 단어입니다."),
    };
  }

  return { validation, error: null };
}

export async function submitWordRequest(previousState, formData) {
  const authorization = await validateGeneralUserRequest();

  if (authorization.error) {
    return authorization.error;
  }

  const form = await validateRequestForm(formData);

  if (form.error) {
    return form.error;
  }

  try {
    const result = await createWordRequest({
      userId: authorization.session.user.id,
      requestedWord: form.validation.requestedWord,
      normalizedWord: form.validation.normalizedWord,
    });

    if (!result.created && result.reason === "duplicate") {
      return actionResult(
        "error",
        "이미 처리 중인 같은 단어 요청이 있습니다."
      );
    }

    await prepareRequestDraft({ requestId: result.requestId, userId: authorization.session.user.id, ...form.validation });
    refresh();

    return actionResult("success", "등록 요청을 보냈습니다. 관리자 검토 후 공개됩니다.");
  } catch (error) {
    console.error("새 단어 요청 등록 실패:", error);

    return actionResult(
      "error",
      "단어 요청을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}

export async function editWordRequest(requestId, previousState, formData) {
  const authorization = await validateGeneralUserRequest();

  if (authorization.error) {
    return authorization.error;
  }

  const form = await validateRequestForm(formData);

  if (form.error) {
    return form.error;
  }

  try {
    const result = await updatePendingWordRequest({
      requestId,
      userId: authorization.session.user.id,
      requestedWord: form.validation.requestedWord,
      normalizedWord: form.validation.normalizedWord,
    });

    if (result.reason === "duplicate") {
      return actionResult(
        "error",
        "이미 처리 중인 같은 단어 요청이 있습니다."
      );
    }

    if (result.reason === "unavailable") {
      return actionResult(
        "error",
        "대기 중인 본인 요청만 수정할 수 있습니다."
      );
    }

    if (result.reason === "unchanged") {
      return actionResult("success", "변경된 요청 내용이 없습니다.");
    }

    await prepareRequestDraft({ requestId, userId: authorization.session.user.id, ...form.validation });
    refresh();

    return actionResult("success", "요청 내용이 수정되었습니다.");
  } catch (error) {
    console.error("새 단어 요청 수정 실패:", error);

    return actionResult(
      "error",
      "요청 내용을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}

export async function editWordEditRequest(requestId, previousState, formData) {
  const authorization = await validateGeneralUserRequest();

  if (authorization.error) {
    return authorization.error;
  }

  const validation = validateWordEditRequestMessage(formData.get("message"));

  if (validation.error) {
    return actionResult("error", validation.error);
  }

  try {
    const result = await updatePendingWordEditRequest({
      requestId,
      userId: authorization.session.user.id,
      message: validation.message,
    });

    if (result.reason === "unavailable") {
      return actionResult("error", "대기 중인 본인 요청만 수정할 수 있습니다.");
    }

    if (result.reason === "unchanged") {
      return actionResult("success", "변경된 수정 요청 내용이 없습니다.");
    }

    refresh();
    return actionResult("success", "수정 요청 내용이 수정되었습니다.");
  } catch (error) {
    console.error("수정 요청 내용 수정 실패:", error);
    return actionResult(
      "error",
      "수정 요청 내용을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
}
