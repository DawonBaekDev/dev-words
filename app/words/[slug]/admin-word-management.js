"use client";


import { useActionState, useRef, useState } from "react";
import { deleteAdminWord, updateAdminWord } from "./admin-actions";
import { CODE_LANGUAGE_LABELS, WORD_CATEGORIES } from "@/lib/words/search";

const initialActionState = {
  type: "idle",
  message: "",
  submittedAt: 0,
};

export default function AdminWordManagement({ word, editRequestId, initiallyEditing = false }) {
  const [isEditing, setIsEditing] = useState(Boolean(editRequestId) || initiallyEditing);
  const updateConfirmationDialogRef = useRef(null);
  const deleteConfirmationDialogRef = useRef(null);
  const updateAction = updateAdminWord.bind(null, word.slug);
  const deleteAction = deleteAdminWord.bind(null, word.slug);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateAction,
    initialActionState
  );
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteAction,
    initialActionState
  );

  return (
    <section className="memo-section" aria-labelledby="admin-word-management-heading">
      <h3 id="admin-word-management-heading">관리자 단어 관리</h3>
      {editRequestId && <p>선택한 수정 요청을 처리하며 단어를 수정합니다.</p>}

      {!isEditing && (
        <div className="form-actions">
          <button type="button" onClick={() => setIsEditing(true)}>
            수정
          </button>
          <button
            type="button"
            onClick={() => deleteConfirmationDialogRef.current?.showModal()}
            disabled={isDeletePending}
          >
            삭제
          </button>
        </div>
      )}

      {isEditing && (
        <form action={updateFormAction}>
          {editRequestId && <input type="hidden" name="editRequestId" value={editRequestId} />}
          <label htmlFor="admin-word-name">단어 이름</label>
          <input id="admin-word-name" name="name" defaultValue={word.name} required />
          <label htmlFor="admin-word-meaning">직역 의미</label>
          <input id="admin-word-meaning" name="meaning" defaultValue={word.meaning} required />
          <label htmlFor="admin-word-slug">슬러그</label>
          <input id="admin-word-slug" name="slug" defaultValue={word.slug} required />
          <label htmlFor="admin-word-description">단어 설명</label>
          <textarea id="admin-word-description" name="description" rows={5} defaultValue={word.description} required />
          <label htmlFor="admin-word-category">카테고리</label>
          <select id="admin-word-category" name="category" defaultValue={word.category} required>
            {WORD_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <label htmlFor="admin-word-tags">태그</label>
          <input id="admin-word-tags" name="tags" defaultValue={word.tags.join(", ")} />
          <label htmlFor="admin-word-code">코드 예시</label>
          <textarea id="admin-word-code" name="codeExample" rows={7} defaultValue={word.codeExample} required />
          <label htmlFor="admin-word-language">코드 언어</label>
          <select id="admin-word-language" name="codeLanguage" defaultValue={word.codeLanguage} required>
            {Object.entries(CODE_LANGUAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="form-actions">
            <button
              type="button"
              onClick={() => updateConfirmationDialogRef.current?.showModal()}
              disabled={isUpdatePending}
            >
              저장
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={isUpdatePending}>
              취소
            </button>
          </div>
          <dialog ref={updateConfirmationDialogRef} aria-labelledby="admin-word-update-confirmation">
            <h2 id="admin-word-update-confirmation">단어 수정 확인</h2>
            <p>변경한 단어 정보를 저장하시겠습니까?</p>
            <div className="form-actions">
              <button type="submit" onClick={() => updateConfirmationDialogRef.current?.close()} disabled={isUpdatePending}>
                {isUpdatePending ? "저장 중..." : "확인"}
              </button>
              <button type="button" onClick={() => updateConfirmationDialogRef.current?.close()} disabled={isUpdatePending}>취소</button>
            </div>
          </dialog>
        </form>
      )}

      <form action={deleteFormAction}>
        <dialog ref={deleteConfirmationDialogRef} aria-labelledby="admin-word-delete-confirmation">
          <h2 id="admin-word-delete-confirmation">단어 삭제 확인</h2>
          <p>이 단어만 삭제되며 복구할 수 없습니다.</p>
          <p>연결된 개인 메모와 요청 내역은 기록으로 남습니다.</p>
          <p>삭제하시겠습니까?</p>
          <div className="form-actions">
            <button type="submit" disabled={isDeletePending}>
              {isDeletePending ? "삭제 중..." : "확인"}
            </button>
            <button type="button" onClick={() => deleteConfirmationDialogRef.current?.close()} disabled={isDeletePending}>취소</button>
          </div>
        </dialog>
      </form>

      {updateState.message && <p className={`status-message ${updateState.type}`} role={updateState.type === "error" ? "alert" : "status"}>{updateState.message}</p>}
      {deleteState.message && <p className={`status-message ${deleteState.type}`} role={deleteState.type === "error" ? "alert" : "status"}>{deleteState.message}</p>}
    </section>
  );
}
