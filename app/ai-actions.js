"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { beginAiRun, endAiRun } from "@/lib/ai/data";
import { generateAiWord } from "@/lib/ai/word";
import { findWordByExactName, findWordBySlug, createWord } from "@/lib/words/data";
import { validateRequestedWord } from "@/lib/word-requests/validation";

function actionResult(type, message) {
  return { type, message, submittedAt: Date.now() };
}

function aiErrorMessage(error) {
  if (error?.message === "AI_TIMEOUT") {
    return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error?.message === "AI_WORD_INVALID") {
    return "AI가 올바른 정보를 만들지 못했습니다. 다시 시도해 주세요.";
  }

  return "AI 기능을 현재 사용할 수 없습니다. 일반 기능은 계속 제공됩니다.";
}

export async function requestAiWord(previousState, formData) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return actionResult("error", "로그인 후 AI 단어 요청을 이용해 주세요.");
  }

  const requestValidation = validateRequestedWord(formData.get("requestedWord"));

  if (requestValidation.error) {
    return actionResult("error", requestValidation.error);
  }

  const requestedSlug = requestValidation.requestedWord.toLowerCase();
  const [existingWord, existingSlugWord] = await Promise.all([
    findWordByExactName(requestValidation.requestedWord),
    /^[a-z0-9-]+$/.test(requestedSlug)
      ? findWordBySlug(requestedSlug)
      : Promise.resolve(null),
  ]);

  if (existingWord || existingSlugWord) {
    redirect(`/words/${(existingWord ?? existingSlugWord).slug}`);
  }

  let runId = "";
  let redirectSlug = "";

  try {
    const run = await beginAiRun({ userId: session.user.id, type: "word" });

    if (!run.started) {
      return actionResult(
        "error",
        run.reason === "running"
          ? "AI 단어 요청을 처리하고 있습니다. 잠시 후 다시 확인해 주세요."
          : "오늘 AI 단어 요청 가능 횟수 5회를 모두 사용했습니다. 내일 다시 시도해 주세요."
      );
    }

    runId = run.runId;
    const generatedWord = await generateAiWord(requestValidation.requestedWord);
    const [sameNameWord, sameSlugWord] = await Promise.all([
      findWordByExactName(generatedWord.name),
      findWordBySlug(generatedWord.slug),
    ]);

    if (sameNameWord || sameSlugWord) {
      redirectSlug = (sameNameWord ?? sameSlugWord).slug;
    } else {
      try {
        await createWord(generatedWord);
        redirectSlug = generatedWord.slug;
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }

        const concurrentWord =
          (await findWordBySlug(generatedWord.slug)) ??
          (await findWordByExactName(generatedWord.name));

        if (!concurrentWord) {
          throw error;
        }

        redirectSlug = concurrentWord.slug;
      }
    }
  } catch (error) {
    console.error("AI 단어 생성 실패:", error);
    return actionResult("error", aiErrorMessage(error));
  } finally {
    if (runId) {
      await endAiRun(runId);
    }
  }

  redirect(`/words/${redirectSlug}`);
}
