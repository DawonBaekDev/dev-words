const fields = {
  name: "단어 이름", meaning: "직역 의미", slug: "슬러그", description: "설명",
  category: "카테고리", tags: "태그", codeExample: "코드 예시", codeLanguage: "코드 언어",
};

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "medium",
  }).format(date);
}

function displayValue(value) {
  return Array.isArray(value) ? value.join(", ") : value || "없음";
}

export default function WordHistory({ words }) {
  return (
    <details className="request-accordion">
      <summary>단어 등록·수정 이력</summary>
      <p>이력 기능 추가 이후의 변경 내용을 보관합니다. 이전 수정 내용은 확인할 수 없습니다.</p>
      {words.length === 0 && <p>등록·수정 이력이 없습니다.</p>}
      <ul className="request-list">
        {words.map((word) => (
          <li key={word._id.toString()}>
            <details>
              <summary>{word.name} · {word.source}{word.deletedAt ? " · 삭제된 단어" : ""}</summary>
              <p>등록 시각: {formatDate(word.createdAt)}</p>
              {word.deletedAt && <p>삭제 시각: {formatDate(word.deletedAt)}</p>}
              {!word.history?.length && <p>보관된 상세 이력이 없습니다.</p>}
              {[...(word.history ?? [])].reverse().map((entry, index) => (
                <article key={index} className="request-card">
                  <h4>{entry.type === "created" ? "등록" : "수정"} · {formatDate(entry.createdAt)}</h4>
                  <p>처리 관리자: {entry.email || entry.userId || "기록 없음"}</p>
                  {Object.entries(fields).filter(([key]) => (
                    entry.type === "created" || JSON.stringify(entry.before?.[key]) !== JSON.stringify(entry.after?.[key])
                  )).map(([key, label]) => (
                    <div key={key}>
                      <strong>{label}</strong>
                      {entry.before && <p style={{ whiteSpace: "pre-wrap" }}>변경 전: {displayValue(entry.before[key])}</p>}
                      <p style={{ whiteSpace: "pre-wrap" }}>{entry.before ? "변경 후" : "등록 내용"}: {displayValue(entry.after[key])}</p>
                    </div>
                  ))}
                </article>
              ))}
            </details>
          </li>
        ))}
      </ul>
    </details>
  );
}
