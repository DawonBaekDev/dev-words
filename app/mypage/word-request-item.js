"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { editWordRequest } from "@/app/actions";
import { MAX_REQUESTED_WORD_LENGTH } from "@/lib/word-requests/validation";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

const STATUS_LABELS = {
  pending: "처리 중",
  completed: "완료",
  rejected: "거절",
};

export default function WordRequestItem({ request }) {
  const [isEditing, setIsEditing] = useState(false);
  const confirmationDialogRef = useRef(null);

  async function handleRequestAction(previousState, formData) {
    const result = await editWordRequest(
      request.id,
      previousState,
      formData
    );

    if (result.type === "success") {
      setIsEditing(false);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    handleRequestAction,
    initialActionState
  );

  return (
    <article className="request-card">
      <div className="request-heading">
        <h3>{request.requestedWord}</h3>
        <span className={`request-status ${request.status}`}>
          {STATUS_LABELS[request.status] ?? request.status}
        </span>
      </div>

      <dl className="request-dates">
        <div>
          <dt>요청일</dt>
          <dd>{request.createdAt}</dd>
        </div>
        <div>
          <dt>{request.status === "pending" ? "마지막 수정일" : "처리일"}</dt>
          <dd>{request.updatedAt}</dd>
        </div>
      </dl>

      {request.status === "rejected" && (
        <p>
          <strong>거절 사유:</strong>{" "}
          {request.rejectionReason || "거절 사유가 등록되지 않았습니다."}
        </p>
      )}

      {request.status !== "pending" &&
        (request.wordSlug ? (
          <p>
            <Link href={`/words/${request.wordSlug}`}>단어 보러 가기</Link>
          </p>
        ) : (
          <p className="deleted-word">삭제된 단어</p>
        ))}

      {request.status === "pending" && !isEditing && (
        <button type="button" onClick={() => setIsEditing(true)}>
          요청 수정
        </button>
      )}

      {request.status === "pending" && isEditing && (
        <form action={formAction}>
          <label htmlFor={`requested-word-${request.id}`}>요청할 단어</label>
          <input
            id={`requested-word-${request.id}`}
            name="requestedWord"
            defaultValue={request.requestedWord}
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
            aria-labelledby={`request-edit-confirmation-${request.id}`}
          >
            <h2 id={`request-edit-confirmation-${request.id}`}>
              요청 내용 수정 확인
            </h2>
            <p>요청 내용을 수정하시겠습니까?</p>
            <div className="form-actions">
              <button
                type="submit"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                {isPending ? "수정 중..." : "확인"}
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

      {state.message && (
        <p
          className={`status-message ${state.type}`}
          role={state.type === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
    </article>
  );
}
