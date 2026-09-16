"use client";

import { useActionState, useRef, useState } from "react";
import { rejectAdminWordRequests } from "./actions";
import AdminWordForm from "./word-form";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function AdminWordRequestGroup({ group }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const confirmationDialogRef = useRef(null);
  const rejectAction = rejectAdminWordRequests.bind(null, group.normalizedWord);
  const [state, formAction, isPending] = useActionState(
    rejectAction,
    initialActionState
  );

  return (
    <article className="request-card">
      <div className="request-heading">
        <h3>{group.requestedWord}</h3>
        <span className="request-status pending">처리 중</span>
      </div>
      <p>
        <strong>요청 인원:</strong> {group.requestCount}명
      </p>
      <dl className="request-dates">
        <div>
          <dt>첫 요청</dt>
          <dd>{group.firstRequestedAt}</dd>
        </div>
        <div>
          <dt>최근 요청</dt>
          <dd>{group.lastRequestedAt}</dd>
        </div>
      </dl>

      <div className="form-actions">
        <AdminWordForm
          initialName={group.requestedWord}
          requestNormalizedWord={group.normalizedWord}
          buttonLabel="단어 등록하기"
        />
        {!isRejecting && (
          <button type="button" onClick={() => setIsRejecting(true)}>
            요청 거절하기
          </button>
        )}
      </div>

      {isRejecting && (
        <form action={formAction}>
          <label htmlFor={`reason-${group.normalizedWord}`}>거절 사유</label>
          <textarea
            id={`reason-${group.normalizedWord}`}
            name="reason"
            rows={4}
            maxLength={1000}
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
              onClick={() => setIsRejecting(false)}
              disabled={isPending}
            >
              취소
            </button>
          </div>
          <dialog ref={confirmationDialogRef} aria-labelledby={`reject-confirm-${group.normalizedWord}`}>
            <h2 id={`reject-confirm-${group.normalizedWord}`}>요청 거절 확인</h2>
            <p>같은 단어의 처리 중 요청을 모두 거절하시겠습니까?</p>
            <div className="form-actions">
              <button
                type="submit"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                {isPending ? "처리 중..." : "확인"}
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
        <p className={`status-message ${state.type}`} role={state.type === "error" ? "alert" : "status"}>
          {state.message}
        </p>
      )}
    </article>
  );
}
