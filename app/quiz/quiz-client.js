"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateQuiz, submitQuiz } from "./actions";
import QuizQuestions from "./quiz-questions";
import QuizText from "@/components/quiz-text";
import { QUIZ_DIFFICULTIES, QUIZ_QUESTION_COUNT } from "@/lib/ai/validation";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

function ActionMessage({ state }) {
  if (!state.message) {
    return null;
  }

  return (
    <p className={`status-message ${state.type}`} role={state.type === "error" ? "alert" : "status"}>
      {state.message}
    </p>
  );
}

export default function QuizClient({ category }) {
  const [quizState, quizFormAction, isQuizPending] = useActionState(
    generateQuiz,
    initialActionState
  );
  const [resultState, resultFormAction, isSubmitPending] = useActionState(
    submitQuiz,
    initialActionState
  );

  if (resultState.results) {
    return (
      <section className="quiz-shell quiz-result" aria-labelledby="quiz-result-heading">
        <h2 id="quiz-result-heading">AI 퀴즈 결과</h2>
        <div className="quiz-result-summary">
          <p>카테고리 <strong>{category}</strong></p>
          <p><strong>{resultState.score}점 / {QUIZ_QUESTION_COUNT}점</strong></p>
        </div>
        <ol className="quiz-question-list">
          {resultState.results.map((result, index) => (
            <li key={result.question}>
              <h3>{index + 1}번 문제</h3>
              <QuizText text={result.question} />
              <p className={result.isCorrect ? "status-message success" : "status-message error"}>
                {result.isCorrect ? "정답입니다." : "오답입니다."}
              </p>
              <p>선택한 답: <QuizText text={result.choices[result.selectedChoiceIndex]} inline /></p>
              <p>정답: <QuizText text={result.choices[result.correctChoiceIndex]} inline /></p>
              <p>해설</p>
              <QuizText text={result.explanation} />
            </li>
          ))}
        </ol>
        <div className="quiz-result-actions">
          <Link className="button secondary-button" href="/mypage?tab=quiz#quiz-notes">퀴즈 노트에서 결과와 메모 보기</Link>
          <button type="button" onClick={() => window.location.reload()}>재도전</button>
          <Link className="button secondary-button" href="/mypage">퀴즈 종료</Link>
        </div>
      </section>
    );
  }

  if (quizState.questions) {
    return (
      <QuizQuestions
        key={quizState.quizId}
        quiz={quizState}
        formAction={resultFormAction}
        isPending={isSubmitPending}
      >
        <ActionMessage state={resultState} />
      </QuizQuestions>
    );
  }

  return (
    <section className="quiz-shell quiz-start" aria-labelledby="quiz-start-heading">
      <h2 id="quiz-start-heading">AI 퀴즈</h2>
      <p className="quiz-meta">선택한 카테고리: <strong>{category}</strong> · <Link href="/quiz">카테고리 변경</Link></p>
      <p className="quiz-intro">난이도를 선택하면 현재 등록된 {category === "전체" ? "전체 단어" : `${category} 단어`}에서 {QUIZ_QUESTION_COUNT}문제를 출제합니다.</p>
      <form className="quiz-form" action={quizFormAction}>
        <input type="hidden" name="category" value={category} />
        <fieldset>
          <legend>난이도</legend>
          <div className="quiz-option-grid quiz-difficulty-options">
            {QUIZ_DIFFICULTIES.map((difficulty) => (
              <label key={difficulty} className="quiz-choice">
                <input type="radio" name="difficulty" value={difficulty} required />
                {difficulty}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="quiz-primary-action">
          <button type="submit" disabled={isQuizPending}>
            {isQuizPending ? "퀴즈를 준비하고 있습니다." : "AI 퀴즈 시작"}
          </button>
        </div>
        {isQuizPending ? (
          <p role="status" aria-live="polite">
            퀴즈를 준비하고 있어요. 잠시만 기다려 주세요.
            <br />
            새로운 문제가 필요한 경우 AI 생성에 약 10~15초 소요될 예정입니다.
          </p>
        ) : (
          <ActionMessage state={quizState} />
        )}
      </form>
    </section>
  );
}
