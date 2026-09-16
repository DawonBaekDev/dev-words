"use client";

export default function ErrorPage({ reset }) {
  return (
    <main>
      <h2>단어를 불러오지 못했습니다.</h2>
      <p>MongoDB 연결 상태를 확인한 뒤 다시 시도해 주세요.</p>
      <button type="button" onClick={reset}>
        다시 시도
      </button>
    </main>
  );
}
