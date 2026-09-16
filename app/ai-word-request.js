"use client";

import { useActionState } from "react";
import { requestAiWord } from "./ai-actions";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function AiWordRequest({ query, userRole }) {
  const [state, formAction, isPending] = useActionState(
    requestAiWord,
    initialActionState
  );

  function openLoginDialog() {
    document.getElementById("open-auth-dialog")?.click();
  }

  if (!userRole) {
    return (
      <button type="button" onClick={openLoginDialog}>
        AI 단어 요청하기
      </button>
    );
  }

  return (
    <form action={formAction} className="ai-word-request-form">
      <input type="hidden" name="requestedWord" value={query} />
      <button type="submit" disabled={isPending}>
        {isPending ? "AI가 단어 설명을 만들고 있습니다." : "AI 단어 요청하기"}
      </button>
      {state.message && (
        <p
          className={`status-message ${state.type}`}
          role={state.type === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
