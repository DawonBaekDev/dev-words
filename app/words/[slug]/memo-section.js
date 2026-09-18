"use client";

import StickerIcon from "@/components/sticker-icon";

import { useActionState, useState } from "react";
import { saveMemo, deleteMemo } from "./actions";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

function MemoEditor({ slug, memo, onCancel, onSaved }) {
  async function handleMemoAction(previousState, formData) {
    const result = await saveMemo(slug, previousState, formData);

    if (result.type === "success") {
      onSaved(result.message);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    handleMemoAction,
    initialActionState
  );

  function handleSubmit(event) {
    const confirmationMessage = memo
      ? "메모를 수정하시겠습니까?"
      : "메모를 저장하시겠습니까?";

    if (!window.confirm(confirmationMessage)) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <label htmlFor="memo-content">메모 내용</label>
      <textarea
        id="memo-content"
        name="content"
        rows={6}
        defaultValue={memo?.content ?? ""}
      />

      {state.type === "error" && (
        <p className="status-message error" role="alert">
          {state.message}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending}>
          취소
        </button>
      </div>
    </form>
  );
}

export default function MemoSection({ slug, memo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [deleteState, deleteAction, isDeleting] = useActionState(async () => {
    const result = await deleteMemo(slug);
    if (result.type === "success") finishEditing(result.message);
    return result;
  }, initialActionState);

  function startEditing() {
    setSuccessMessage("");
    setIsEditing(true);
  }

  function finishEditing(message) {
    setSuccessMessage(message);
    setIsEditing(false);
  }

  return (
    <section className="memo-section" aria-labelledby="memo-heading">
      <h3 id="memo-heading">개인 메모</h3>

      {!isEditing && memo && (
        <div className="memo-content">
          <p>{memo.content}</p>
          <dl>
            <div>
              <dt>작성 시각</dt>
              <dd>{memo.createdAt}</dd>
            </div>
            <div>
              <dt>수정 시각</dt>
              <dd>{memo.updatedAt}</dd>
            </div>
          </dl>
          <button type="button" onClick={startEditing}>
            <StickerIcon name="pencil" /> 수정
          </button>
          <form action={deleteAction} onSubmit={(event) => {
            if (!window.confirm("메모를 삭제하시겠습니까? 삭제 이력은 보관됩니다.")) event.preventDefault();
          }}>
            <button type="submit" disabled={isDeleting}>{isDeleting ? "삭제 중..." : "메모 삭제"}</button>
          </form>
          {deleteState.type === "error" && <p role="alert">{deleteState.message}</p>}
        </div>
      )}

      {!isEditing && !memo && (
        <button type="button" onClick={startEditing}>
          <StickerIcon name="pencil" /> 메모하기
        </button>
      )}

      {isEditing && (
        <MemoEditor
          slug={slug}
          memo={memo}
          onCancel={() => setIsEditing(false)}
          onSaved={finishEditing}
        />
      )}

      {successMessage && (
        <p className="status-message success" aria-live="polite">
          {successMessage}
        </p>
      )}
    </section>
  );
}
