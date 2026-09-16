"use client";

import { useActionState } from "react";
import { generateQuiz, submitQuiz } from "./actions";
import { QUIZ_DIFFICULTIES } from "@/lib/ai/validation";

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

export default function QuizClient() {
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
      <section aria-labelledby="quiz-result-heading">
        <h2 id="quiz-result-heading">AI 퀴즈 결과</h2>
        <p><strong>{resultState.score}점 / 3점</strong></p>
        <ol className="quiz-question-list">
          {resultState.results.map((result, index) => (
            <li key={result.question}>
              <h3>{index + 1}. {result.question}</h3>
              <p className={result.isCorrect ? "status-message success" : "status-message error"}>
                {result.isCorrect ? "정답입니다." : "오답입니다."}
              </p>
              <p>선택한 답: {result.choices[result.selectedChoiceIndex]}</p>
              <p>정답: {result.choices[result.correctChoiceIndex]}</p>
              <p>해설: {result.explanation}</p>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => window.location.reload()}>새 퀴즈 시작</button>
      </section>
    );
  }

  if (quizState.questions) {
    return (
      <section aria-labelledby="quiz-question-heading">
        <h2 id="quiz-question-heading">{quizState.difficulty} AI 퀴즈</h2>
        <form action={resultFormAction}>
          <input type="hidden" name="quizId" value={quizState.quizId} />
          <ol className="quiz-question-list">
            {quizState.questions.map((question, questionIndex) => (
              <li key={question.wordId}>
                <fieldset>
                  <legend>{question.question}</legend>
                  {question.choices.map((choice, choiceIndex) => (
                    <label key={choice} className="quiz-choice">
                      <input
                        type="radio"
                        name={`answer-${questionIndex}`}
                        value={choiceIndex}
                        required
                      />
                      {choice}
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ol>
          <button type="submit" disabled={isSubmitPending}>
            {isSubmitPending ? "채점 중..." : "정답 제출"}
          </button>
          <ActionMessage state={resultState} />
        </form>
      </section>
    );
  }

  return (
    <section aria-labelledby="quiz-start-heading">
      <h2 id="quiz-start-heading">AI 퀴즈</h2>
      <p>난이도를 선택하면 현재 단어장에서 3문제를 만듭니다.</p>
      <form action={quizFormAction}>
        <fieldset>
          <legend>난이도</legend>
          {QUIZ_DIFFICULTIES.map((difficulty) => (
            <label key={difficulty} className="quiz-choice">
              <input type="radio" name="difficulty" value={difficulty} required />
              {difficulty}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={isQuizPending}>
          {isQuizPending ? "AI가 퀴즈를 만들고 있습니다." : "AI 퀴즈 시작"}
        </button>
        <ActionMessage state={quizState} />
      </form>
    </section>
  );
}
