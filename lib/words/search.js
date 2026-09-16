export const WORD_CATEGORIES = [
  "웹 기초",
  "React",
  "데이터",
  "Next.js",
  "JavaScript",
  "기타",
];

export const CODE_LANGUAGE_LABELS = {
  javascript: "JavaScript",
  jsx: "JSX",
  bash: "Bash",
  text: "Text",
};

function getFirstValue(value) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeWordSearchParams(searchParams = {}) {
  const queryValue = getFirstValue(searchParams.query);
  const categoryValue = getFirstValue(searchParams.category);
  const query = typeof queryValue === "string" ? queryValue.trim() : "";
  const category = WORD_CATEGORIES.includes(categoryValue)
    ? categoryValue
    : "";

  return { query, category };
}

export function buildWordMongoFilter({ query = "", category = "" }) {
  const filter = {};

  if (query) {
    const queryExpression = new RegExp(escapeRegularExpression(query), "i");

    filter.$or = [
      { name: queryExpression },
      { description: queryExpression },
    ];
  }

  if (WORD_CATEGORIES.includes(category)) {
    filter.category = category;
  }

  return filter;
}
