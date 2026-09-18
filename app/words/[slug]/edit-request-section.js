"use client";


import { useActionState, useRef, useState } from "react";
import { saveWordEditRequest } from "./edit-request-actions";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function EditRequestSection({ slug, request }) {
  const [isEditing, setIsEditing] = useState(false);
  const confirmationDialogRef = useRef(null);

  async function handleAction(previousState, formData) {
    const result = await saveWordEditRequest(slug, previousState, formData);

    if (result.type === "success") {
      setIsEditing(false);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    handleAction,
    initialActionState
  );

  return (
    <section className="memo-section" aria-labelledby="edit-request-heading">
      <h3 id="edit-request-heading">수정 요청</h3>
      {!isEditing && (
        <button type="button" onClick={() => setIsEditing(true)}>
          {request ? "수정 요청 내용 수정" : "수정 요청하기"}
        </button>
      )}

      {isEditing && (
        <form action={formAction}>
          <label htmlFor="word-edit-request-message">수정 의견</label>
          <textarea
            id="word-edit-request-message"
            name="message"
            rows={6}
            maxLength={1000}
            defaultValue={request?.message ?? ""}
            placeholder={"예시)\n수정할 부분: 단어 설명\n수정 이유: 현재 설명이 초보자가 이해하기 어렵습니다.\n수정 제안: HTTP는 브라우저와 서버가 데이터를 주고받기 위한 약속입니다."}
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
            <button type="button" onClick={() => setIsEditing(false)} disabled={isPending}>
              취소
            </button>
          </div>
          <dialog ref={confirmationDialogRef} aria-labelledby="word-edit-request-confirmation">
            <h2 id="word-edit-request-confirmation">수정 요청 확인</h2>
            <p>수정 요청을 저장하시겠습니까?</p>
            <div className="form-actions">
              <button
                type="submit"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                {isPending ? "저장 중..." : "확인"}
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

      {request && !isEditing && <p>현재 처리 중인 수정 요청이 있습니다.</p>}
      {state.message && (
        <p className={`status-message ${state.type}`} role={state.type === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </section>
  );
}
