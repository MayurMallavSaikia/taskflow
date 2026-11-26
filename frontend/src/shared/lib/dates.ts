/** Today's date as yyyy-mm-dd in the user's local time zone (what <input type="date"> uses). */
export function todayIso(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
