import assert from "node:assert/strict";
import test from "node:test";
import { getMonthDetails, getSeoulDateKey, isValidDateKey } from "../lib/study-calendar/date.js";

test("서울 기준 날짜는 자정 경계에서 올바르게 바뀐다", () => {
  assert.equal(getSeoulDateKey(new Date("2026-09-17T14:59:00Z")), "2026-09-17");
  assert.equal(getSeoulDateKey(new Date("2026-09-17T15:00:00Z")), "2026-09-18");
});

test("공부 달력은 실제 날짜와 이전·다음 달을 확인한다", () => {
  assert.equal(isValidDateKey("2024-02-29"), true);
  assert.equal(isValidDateKey("2026-02-29"), false);
  assert.equal(isValidDateKey("2026-13-01"), false);
  const december = getMonthDetails("2026-12");
  assert.equal(december.lastDay, 31);
  assert.equal(december.previousMonth, "2026-11");
  assert.equal(december.nextMonth, "2027-01");
  assert.equal(getSeoulDateKey(december.start), "2026-12-01");
  assert.equal(getSeoulDateKey(new Date(december.end.getTime() - 1)), "2026-12-31");
});
