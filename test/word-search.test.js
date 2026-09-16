import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWordMongoFilter,
  escapeRegularExpression,
  normalizeWordSearchParams,
} from "../lib/words/search.js";

test("검색어의 앞뒤 공백을 제거하고 올바른 카테고리를 유지한다", () => {
  assert.deepEqual(
    normalizeWordSearchParams({
      query: "  요청  ",
      category: "웹 기초",
    }),
    {
      query: "요청",
      category: "웹 기초",
    }
  );
});

test("반복된 Query String은 첫 번째 값만 사용한다", () => {
  assert.deepEqual(
    normalizeWordSearchParams({
      query: ["React", "MongoDB"],
      category: ["React", "데이터"],
    }),
    {
      query: "React",
      category: "React",
    }
  );
});

test("정의되지 않은 카테고리는 필터에서 제외한다", () => {
  assert.deepEqual(
    normalizeWordSearchParams({ category: "존재하지 않는 카테고리" }),
    {
      query: "",
      category: "",
    }
  );
});

test("정규식 특수문자를 일반 검색 문자로 바꾼다", () => {
  const escaped = escapeRegularExpression("Promise.all()?");

  assert.equal(escaped, "Promise\\.all\\(\\)\\?");
  assert.equal(new RegExp(escaped, "i").test("promise.all()? 사용법"), true);
});

test("검색어와 카테고리를 함께 MongoDB 조건으로 만든다", () => {
  const filter = buildWordMongoFilter({
    query: "요청",
    category: "웹 기초",
  });

  assert.equal(filter.category, "웹 기초");
  assert.equal(filter.$or.length, 2);
  assert.equal(filter.$or[0].name.test("요청과 응답"), true);
  assert.equal(filter.$or[1].description.test("HTTP 요청"), true);
});
