import Link from "next/link";

const fields = {
  name: "단어 이름", meaning: "직역 의미", slug: "슬러그", description: "설명",
  category: "카테고리", tags: "태그", codeExample: "코드 예시", codeLanguage: "코드 언어",
};

const sources = [
  { value: "AI요청", label: "AI요청" },
  { value: "관리자 작성", label: "관리자 작성" },
  { value: "초기 데이터", label: "초기 데이터" },
];

function sourceGroup(word) {
  return word.source === "AI요청" || word.source === "관리자 작성"
    ? word.source : "초기 데이터";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "medium",
  }).format(date);
}

function displayValue(value) {
  return Array.isArray(value) ? value.join(", ") : value || "없음";
}

export default function WordHistory({ words, selectedSource }) {
  const visibleWords = selectedSource === "전체"
    ? words : words.filter((word) => sourceGroup(word) === selectedSource);

  return (
    <details id="word-history" className="request-accordion" open>
      <summary>단어 등록·수정 이력 · {visibleWords.length}건</summary>
      <p>등록 출처를 비교하고, 단어를 펼쳐 수정 전·후 내용을 확인하세요.</p>

      <div className="word-source-overview" aria-label="등록 출처별 단어 수">
        {sources.map((source) => {
          const sourceWords = words.filter((word) => sourceGroup(word) === source.value);
          return (
            <div className="word-source-card" key={source.value}>
              <strong>{source.label}</strong>
              <span>{sourceWords.length}개</span>
              <small>{sourceWords.length > 0
                ? `최근 등록: ${sourceWords.slice(0, 3).map((word) => word.name).join(", ")}`
                : "등록된 단어가 없습니다."}</small>
            </div>
          );
        })}
      </div>

      <nav className="word-history-filters" aria-label="등록 출처 필터">
        {[{ value: "전체", label: "전체" }, ...sources].map((source) => (
          <Link
            key={source.value}
            href={source.value === "전체" ? "/admin?tab=history#word-history" : `/admin?tab=history&source=${encodeURIComponent(source.value)}#word-history`}
            aria-current={selectedSource === source.value ? "page" : undefined}
          >
            {source.label}
          </Link>
        ))}
      </nav>

      {visibleWords.length === 0 && <p>선택한 출처의 단어가 없습니다.</p>}
      <ul className="request-list word-history-list">
        {visibleWords.map((word) => (
          <li key={word._id.toString()}>
            <details>
              <summary>
                <span className="word-history-name">{word.name}</span>
                <span className="request-status">{word.source}</span>
                <small>{formatDate(word.createdAt)}</small>
                {word.deletedAt && <small className="deleted-word">삭제된 단어</small>}
              </summary>
              <p>등록 시각: {formatDate(word.createdAt)}</p>
              {word.deletedAt && <p>삭제 시각: {formatDate(word.deletedAt)}</p>}
              {!word.history?.length && <p>이력 기능 도입 전에 등록된 단어입니다. 이후 수정 내역부터 표시됩니다.</p>}
              {[...(word.history ?? [])].reverse().map((entry, index) => (
                <article key={index} className="request-card">
                  <h4>{entry.type === "created" ? "등록" : "수정"} · {formatDate(entry.createdAt)}</h4>
                  <p>처리 관리자: {entry.email || entry.userId || "기록 없음"}</p>
                  {Object.entries(fields).filter(([key]) => (
                    entry.type === "created" || JSON.stringify(entry.before?.[key]) !== JSON.stringify(entry.after?.[key])
                  )).map(([key, label]) => (
                    <div key={key} className="word-history-change">
                      <strong>{label}</strong>
                      {entry.before && <p>변경 전: {displayValue(entry.before[key])}</p>}
                      <p>{entry.before ? "변경 후" : "등록 내용"}: {displayValue(entry.after[key])}</p>
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
