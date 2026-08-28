function getWeeks(yearNum, monthNum) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weeks = [];
  let currentDate = new Date(Date.UTC(yearNum, monthNum, 1));
  const lastDate = new Date(Date.UTC(yearNum, monthNum + 1, 0));

  let weekNumber = 1;
  while (currentDate <= lastDate) {
    const weekStart = new Date(currentDate);
    let weekEnd = new Date(currentDate);
    
    const day = weekEnd.getUTCDay();
    const daysToSunday = day === 0 ? 0 : 7 - day;
    weekEnd.setUTCDate(weekEnd.getUTCDate() + daysToSunday);
    
    if (weekEnd > lastDate) {
      weekEnd = new Date(lastDate);
    }
    
    weeks.push({
      value: weekNumber.toString(),
      label: `Week ${weekNumber} (${weekStart.getUTCDate()} - ${weekEnd.getUTCDate()} ${months[monthNum]})`,
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0]
    });
    
    currentDate = new Date(weekEnd);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    weekNumber++;
  }
  return weeks;
}

console.log("May 2026:");
console.log(getWeeks(2026, 4));
console.log("June 2026:");
console.log(getWeeks(2026, 5));
