import { computeStats, type Pattern } from "./pattern";
export function sessionSummary(p: Pattern) {
  const sessions = p.sessions ?? [], seconds = sessions.reduce((n, s) => n + s.seconds, 0), cells = sessions.reduce((n, s) => n + s.cells, 0);
  const days = [...new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.date))].sort();
  let longest = 0, chain = 0, previous = 0;
  for (const date of days) { const time = Date.parse(`${date}T12:00:00Z`); chain = time - previous === 86400000 ? chain + 1 : 1; previous = time; longest = Math.max(longest, chain); }
  const { totals } = computeStats(p), remaining = totals.contentCells - totals.doneCells;
  const perMinute = seconds > 0 ? cells / seconds * 60 : 0;
  const activeDays = Math.max(1, days.length), perDay = cells / activeDays;
  const eta = perDay > 0 && days.length >= 3 ? new Date(Date.now() + Math.ceil(remaining / perDay) * 86400000).toLocaleDateString("fr-FR") : null;
  return { longest, activeDays: days.length, perMinute, eta };
}