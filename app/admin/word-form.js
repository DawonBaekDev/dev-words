"use client";

import { useActionState, useRef, useState } from "react";
import { createAdminWord } from "./actions";
import { CODE_LANGUAGE_LABELS, WORD_CATEGORIES } from "@/lib/words/search";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function AdminWordForm({
  initialName = "",
  requestNormalizedWord = "",
  buttonLabel = "새 단어 등록",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const confirmationDialogRef = useRef(null);

  async function handleWordAction(previousState, formData) {
    const result = await createAdminWord(previousState, formData);

    if (result.type === "success") {
      setIsEditing(false);
    }

    return result;
  }

  const [state, formAction, isPending] = useActionState(
    handleWordAction,
    initialActionState
  );
  const fieldSuffix = requestNormalizedWord || "new-word";

  return (
    <div className="admin-word-form">
      {!isEditing && (
        <button type="button" onClick={() => setIsEditing(true)}>
          {buttonLabel}
        </button>
      )}

      {isEditing && (
        <form action={formAction}>
          {requestNormalizedWord && (
            <input
              type="hidden"
              name="requestNormalizedWord"
              value={requestNormalizedWord}
            />
          )}

          <label htmlFor={`word-name-${fieldSuffix}`}>단어 이름</label>
          <input
            id={`word-name-${fieldSuffix}`}
            name="name"
            defaultValue={initialName}
            maxLength={100}
            required
          />

          <label htmlFor={`word-meaning-${fieldSuffix}`}>직역 의미</label>
          <input
            id={`word-meaning-${fieldSuffix}`}
            name="meaning"
            placeholder="예: branch : 나무의 가지"
            maxLength={300}
            required
          />

          <label htmlFor={`word-slug-${fieldSuffix}`}>슬러그</label>
          <input
            id={`word-slug-${fieldSuffix}`}
            name="slug"
            placeholder="예: branch"
            required
          />

          <label htmlFor={`word-description-${fieldSuffix}`}>단어 설명</label>
          <textarea
            id={`word-description-${fieldSuffix}`}
            name="description"
            rows={5}
            maxLength={1000}
            required
          />

          <label htmlFor={`word-category-${fieldSuffix}`}>카테고리</label>
          <select id={`word-category-${fieldSuffix}`} name="category" required>
            <option value="">카테고리 선택</option>
            {WORD_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <label htmlFor={`word-tags-${fieldSuffix}`}>태그</label>
          <input
            id={`word-tags-${fieldSuffix}`}
            name="tags"
            placeholder="예: Git, 작업 흐름"
          />

          <label htmlFor={`word-code-${fieldSuffix}`}>코드 예시</label>
          <textarea
            id={`word-code-${fieldSuffix}`}
            name="codeExample"
            rows={7}
            maxLength={5000}
            required
          />

          <label htmlFor={`word-language-${fieldSuffix}`}>코드 언어</label>
          <select id={`word-language-${fieldSuffix}`} name="codeLanguage" required>
            {Object.entries(CODE_LANGUAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

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

          <dialog ref={confirmationDialogRef} aria-labelledby={`word-confirm-${fieldSuffix}`}>
            <h2 id={`word-confirm-${fieldSuffix}`}>단어 등록 확인</h2>
            <p>이 단어를 등록하시겠습니까?</p>
            <div className="form-actions">
              <button
                type="submit"
                onClick={() => confirmationDialogRef.current?.close()}
                disabled={isPending}
              >
                {isPending ? "등록 중..." : "확인"}
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
    </div>
  );
}
