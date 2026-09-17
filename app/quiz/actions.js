"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { canUseAiQuiz } from "@/lib/ai/access";
import {
  beginAiRun,
  completeQuizSession,
  createQuizSession,
  endAiRun,
} from "@/lib/ai/data";
import { generateAiQuiz } from "@/lib/ai/quiz";
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, QUIZ_QUESTION_COUNT, validateQuizAnswers } from "@/lib/ai/validation";
import { findRandomWords } from "@/lib/words/data";

function actionResult(type, message, extra = {}) {
  return { type, message, submittedAt: Date.now(), ...extra };
}

function aiQuizErrorMessage(error) {
  if (error?.message === "AI_CLI_UNAVAILABLE") {
    return "서버에서 Codex CLI를 찾지 못했습니다. 설치 경로를 확인해 주세요.";
  }

  if (error?.message === "AI_CLI_FAILED") {
    return "Codex CLI 실행에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error?.message === "AI_TIMEOUT") {
    return "AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error?.message === "AI_QUIZ_INVALID") {
    return "AI가 올바른 퀴즈를 만들지 못했습니다. 다시 시도해 주세요.";
  }

  return "퀴즈를 만들지 못했습니다. 다시 시도해 주세요.";
}

async function getQuizUser() {
  const session = await getCurrentSession();
  return canUseAiQuiz(session?.user) ? session.user : null;
}

export async function generateQuiz(previousState, formData) {
  const user = await getQuizUser();

  if (!user) {
    return actionResult("error", "일반 사용자 계정으로 로그인한 뒤 AI 퀴즈를 이용해 주세요.");
  }

  const difficulty = formData.get("difficulty");
  const category = formData.get("category");

  if (typeof difficulty !== "string" || !QUIZ_DIFFICULTIES.includes(difficulty)) {
    return actionResult("error", "올바른 난이도를 선택해 주세요.");
  }

  if (typeof category !== "string" || !QUIZ_CATEGORIES.includes(category)) {
    return actionResult("error", "올바른 카테고리를 선택해 주세요.");
  }

  let runId = "";

  try {
    // 생성 직전의 단어 목록에서 뽑아 새로 등록된 단어도 출제 대상에 포함합니다.
    const words = await findRandomWords(QUIZ_QUESTION_COUNT, category);

    if (words.length !== QUIZ_QUESTION_COUNT) {
      return actionResult("error", `선택한 카테고리에 퀴즈를 만들 단어가 ${QUIZ_QUESTION_COUNT}개 이상 필요합니다.`);
    }

    const run = await beginAiRun({ userId: user.id, type: "quiz" });

    if (!run.started) {
      return actionResult(
        "error",
        run.reason === "running"
          ? "AI 퀴즈를 만들고 있습니다. 잠시 후 다시 확인해 주세요."
          : "오늘 AI 퀴즈 가능 횟수 5회를 모두 사용했습니다. 내일 다시 시도해 주세요."
      );
    }

    runId = run.runId;
    const quiz = await generateAiQuiz({ difficulty, words });
    const quizId = await createQuizSession({ userId: user.id, quiz, category });

    return actionResult("success", "퀴즈가 준비되었습니다.", {
      quizId,
      category,
      difficulty: quiz.difficulty,
      questions: quiz.questions.map((question) => ({
        wordId: question.wordId,
        question: question.question,
        choices: question.choices,
      })),
    });
  } catch (error) {
    console.error("AI 퀴즈 생성 실패:", error);
    return actionResult("error", aiQuizErrorMessage(error));
  } finally {
    if (runId) {
      await endAiRun(runId);
      revalidatePath("/");
    }
  }
}

export async function submitQuiz(previousState, formData) {
  const user = await getQuizUser();

  if (!user) {
    return actionResult("error", "일반 사용자 계정으로 로그인한 뒤 퀴즈를 제출해 주세요.");
  }

  const quizId = formData.get("quizId");

  if (typeof quizId !== "string") {
    return actionResult("error", "제출할 퀴즈를 찾을 수 없습니다.");
  }

  const { answers, error } = validateQuizAnswers(formData);
  if (error) return actionResult("error", error);

  const quiz = await completeQuizSession({ quizId, userId: user.id, answers });

  if (!quiz) {
    return actionResult("error", "퀴즈 시간이 지났거나 이미 제출되었습니다. 새 퀴즈를 시작해 주세요.");
  }

  return actionResult("success", "채점이 완료되었습니다.", { score: quiz.score, results: quiz.results });
}
