"use client";

import { useActionState } from "react";
import { deleteRegisteredWord } from "./actions";

export default function DeleteWord({ slug }) {
  const [state, action, pending] = useActionState(() => deleteRegisteredWord(slug), { message: "" });
  return <form action={action} onSubmit={(event) => {
    if (!window.confirm("이 단어만 삭제되며 복구할 수 없습니다. 연결된 메모와 요청 이력은 남습니다. 삭제하시겠습니까?")) event.preventDefault();
  }}>
    <button type="submit" disabled={pending}>{pending ? "삭제 중..." : "삭제"}</button>
    {state.message && <p role="status">{state.message}</p>}
  </form>;
}
