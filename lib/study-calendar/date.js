const SEOUL_TIME_ZONE = "Asia/Seoul";

export function getSeoulDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return false;
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
}

export function getMonthDetails(value) {
  const today = getSeoulDateKey(new Date());
  const monthKey = typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100
    ? value : today.slice(0, 7);
  const [year, month] = monthKey.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    monthKey,
    year,
    month,
    lastDay,
    firstWeekday: new Date(Date.UTC(year, month - 1, 1)).getUTCDay(),
    start: new Date(`${monthKey}-01T00:00:00+09:00`),
    end: new Date(`${nextMonth.toISOString().slice(0, 7)}-01T00:00:00+09:00`),
    previousMonth: previousMonth.toISOString().slice(0, 7),
    nextMonth: nextMonth.toISOString().slice(0, 7),
    today,
  };
}
