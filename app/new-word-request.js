"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { submitWordRequest } from "./actions";
import { MAX_REQUESTED_WORD_LENGTH } from "@/lib/word-requests/validation";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function NewWordRequest({ query, userRole }) {
  const [isEditing, setIsEditing] = useState(false);
  const confirmationDialogRef = useRef(null);

  async function handleRequestAction(previousState, formData) {
    const result = await submitWordRequest(previousState, formData);

    if (result.type === "success") {
      setIsEditing(false);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    handleRequestAction,
    initialActionState
  );

  function openLoginDialog() {
    document.getElementById("open-auth-dialog")?.click();
  }

  if (!userRole) {
    return (
      <button type="button" onClick={openLoginDialog}>
        단어 등록 요청
      </button>
    );
  }

  if (userRole === "admin") {
    return (
      <p>
        <Link href="/admin">관리자 페이지에서 사용자 요청 확인하기</Link>
      </p>
    );
  }

  return (
    <div className="word-request-form">
      {!isEditing && (
        <button type="button" onClick={() => setIsEditing(true)}>
          단어 등록 요청
        </button>
      )}

      {isEditing && (
        <form action={formAction}>
          <label htmlFor="requested-word">요청할 단어</label>
          <input
            id="requested-word"
            name="requestedWord"
            defaultValue={query}
            maxLength={MAX_REQUESTED_WORD_LENGTH}
            required
          />
          <div className="form-actions">
            <button
              type="button"
              onClick={() => confirmationDialogRef.current?.showModal()}
              disabled={isPending}
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isPending}
            >
              취소
            </button>
          </div>

          <dialog
            ref={confirmationDialogRef}
            aria-labelledby="word-request-confirmation"
          >
            <h2 id="word-request-confirmation">새 단어 요청 확인</h2>
            <p>이 단어를 요청하시겠습니까?</p>
            <div className="form-actions">
              <button
                type="submit"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                {isPending ? "요청 중..." : "확인"}
              </button>
              <button
                type="button"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                취소
              </button>
            </div>
          </dialog>
        </form>
      )}

      {isPending && <p role="status">AI가 초안을 작성하고 있습니다. 완료 후 관리자에게 검토를 요청합니다.</p>}
      {state.message && (
        <p
          className={`status-message ${state.type}`}
          role={state.type === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
