"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { canUseAiQuiz } from "@/lib/ai/access";
import {
  beginAiRun,
  consumeQuizSession,
  createQuizSession,
  endAiRun,
} from "@/lib/ai/data";
import { generateAiQuiz } from "@/lib/ai/quiz";
import { QUIZ_DIFFICULTIES } from "@/lib/ai/validation";
import { findRandomWords } from "@/lib/words/data";

function actionResult(type, message, extra = {}) {
  return { type, message, submittedAt: Date.now(), ...extra };
}

function aiQuizErrorMessage(error) {
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

  if (typeof difficulty !== "string" || !QUIZ_DIFFICULTIES.includes(difficulty)) {
    return actionResult("error", "올바른 난이도를 선택해 주세요.");
  }

  let runId = "";

  try {
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
    const words = await findRandomWords(3);

    if (words.length !== 3) {
      return actionResult("error", "퀴즈를 만들 단어가 부족합니다.");
    }

    const quiz = await generateAiQuiz({ difficulty, words });
    const quizId = await createQuizSession({ userId: user.id, quiz });

    return actionResult("success", "퀴즈가 준비되었습니다.", {
      quizId,
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

  const answers = [0, 1, 2].map((index) => Number(formData.get(`answer-${index}`)));

  if (answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
    return actionResult("error", "세 문제의 답을 모두 선택해 주세요.");
  }

  const quiz = await consumeQuizSession({ quizId, userId: user.id });

  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length !== 3) {
    return actionResult("error", "퀴즈 시간이 지났거나 이미 제출되었습니다. 새 퀴즈를 시작해 주세요.");
  }

  const results = quiz.questions.map((question, index) => ({
    question: question.question,
    choices: question.choices,
    selectedChoiceIndex: answers[index],
    correctChoiceIndex: question.correctChoiceIndex,
    explanation: question.explanation,
    isCorrect: answers[index] === question.correctChoiceIndex,
  }));
  const score = results.filter((result) => result.isCorrect).length;

  return actionResult("success", "채점이 완료되었습니다.", { score, results });
}
