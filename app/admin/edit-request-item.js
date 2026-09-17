"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { rejectAdminWordEditRequest } from "./actions";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function AdminEditRequestItem({ request }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const confirmationDialogRef = useRef(null);
  const rejectAction = rejectAdminWordEditRequest.bind(null, request.id);
  const [state, formAction, isPending] = useActionState(
    rejectAction,
    initialActionState
  );

  return (
    <article className="request-card">
      <div className="request-heading">
        <h3>{request.wordName ?? "삭제된 단어"}</h3>
        <span className="request-status pending">처리 중</span>
      </div>
      <p>{request.message}</p>
      <p className="request-user"><strong>요청한 사용자:</strong> {request.userEmail}</p>
      <dl className="request-dates">
        <div>
          <dt>요청일</dt>
          <dd>{request.createdAt}</dd>
        </div>
        <div>
          <dt>마지막 수정일</dt>
          <dd>{request.updatedAt}</dd>
        </div>
      </dl>
      <div className="form-actions">
        {request.wordSlug ? (
          <Link href={`/words/${request.wordSlug}?editRequestId=${request.id}`} role="button">
            단어 수정하기
          </Link>
        ) : (
          <span className="deleted-word">삭제된 단어</span>
        )}
        {!isRejecting && (
          <button type="button" onClick={() => setIsRejecting(true)}>
            요청 거절하기
          </button>
        )}
      </div>

      {isRejecting && (
        <form action={formAction}>
          <label htmlFor={`edit-reason-${request.id}`}>거절 사유</label>
          <textarea id={`edit-reason-${request.id}`} name="reason" rows={4} maxLength={1000} required />
          <div className="form-actions">
            <button type="button" onClick={() => confirmationDialogRef.current?.showModal()} disabled={isPending}>저장</button>
            <button type="button" onClick={() => setIsRejecting(false)} disabled={isPending}>취소</button>
          </div>
          <dialog ref={confirmationDialogRef} aria-labelledby={`edit-reject-confirmation-${request.id}`}>
            <h2 id={`edit-reject-confirmation-${request.id}`}>수정 요청 거절 확인</h2>
            <p>이 수정 요청을 거절하시겠습니까?</p>
            <div className="form-actions">
              <button type="submit" onClick={() => confirmationDialogRef.current?.close()} disabled={isPending}>
                {isPending ? "처리 중..." : "확인"}
              </button>
              <button type="button" onClick={() => confirmationDialogRef.current?.close()} disabled={isPending}>취소</button>
            </div>
          </dialog>
        </form>
      )}

      {state.message && <p className={`status-message ${state.type}`} role={state.type === "error" ? "alert" : "status"}>{state.message}</p>}
    </article>
  );
}
