function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
function getWeekEnd(weekStart) {
  const d = new Date(weekStart)
  d.setUTCDate(d.getUTCDate() + 6)
  d.setUTCHours(23, 59, 59, 999)
  return d
}
function fmtDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const testDates = [
  "2026-05-23T00:00:00.000Z", // Saturday
  "2026-05-24T00:00:00.000Z", // Sunday
  "2026-05-25T00:00:00.000Z", // Monday
  "2026-05-26T00:00:00.000Z", // Tuesday
  "2026-05-27T00:00:00.000Z", // Wednesday
];

for (const iso of testDates) {
  const targetDate = new Date(iso);
  const weekStartDt = getWeekStart(targetDate);
  const weekEndDt = getWeekEnd(weekStartDt);
  console.log(`Input: ${iso}`);
  console.log(`Date col: ${fmtDate(targetDate)}`);
  console.log(`Week col: ${fmtDate(weekStartDt)} - ${fmtDate(weekEndDt)}`);
  console.log('---');
}
