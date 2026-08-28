import { fmtDateInput, getWeekStart, getWeekEnd, getMonthStart, getMonthEnd } from '@/lib/utils'

export interface DateFilterState {
  preset: string
  from: string
  to: string
  year?: any
  month?: any
  week?: any
}

export function defaultDateFilter(): DateFilterState {
  return { preset: 'all_time', from: '', to: '', year: 'all', month: 'all', week: 'all' }
}

export default function DateFilter({
  filter,
  setFilter,
}: {
  filter: DateFilterState
  setFilter: React.Dispatch<React.SetStateAction<any>>
}) {
  function handlePresetChange(preset: string) {
    const now = new Date()
    let from = ''
    let to = ''

    if (preset === 'last_week') {
      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 7)
      from = fmtDateInput(getWeekStart(lastWeek))
      to = fmtDateInput(getWeekEnd(getWeekStart(lastWeek)))
    } else if (preset === 'last_4_weeks') {
      const d = new Date(now)
      d.setDate(d.getDate() - 28)
      from = fmtDateInput(getWeekStart(d))
      to = fmtDateInput(now)
    } else if (preset === 'this_month') {
      from = fmtDateInput(getMonthStart(now))
      to = fmtDateInput(getMonthEnd(now))
    } else if (preset === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      from = fmtDateInput(getMonthStart(lastMonth))
      to = fmtDateInput(getMonthEnd(lastMonth))
    } else if (preset === 'custom') {
      from = filter.from
      to = filter.to
    }

    setFilter((f: any) => ({ ...f, preset, from, to, year: 'all', month: 'all', week: 'all' }))
  }

  function handleYearChange(y: string) {
    if (y === 'all') {
      setFilter((f: any) => ({ ...f, year: 'all', month: 'all', week: 'all', preset: 'all_time', from: '', to: '' }))
      return
    }

    const yearNum = parseInt(y)
    const mStr = filter.month || 'all'
    let newFrom = ''
    let newTo = ''

    if (mStr !== 'all') {
      const monthNum = parseInt(mStr)
      const startDate = new Date(Date.UTC(yearNum, monthNum, 1))
      newFrom = fmtDateInput(startDate)
      newTo = fmtDateInput(getMonthEnd(startDate))
    } else {
      const startDate = new Date(Date.UTC(yearNum, 0, 1))
      const endDate = new Date(Date.UTC(yearNum, 11, 31))
      newFrom = fmtDateInput(startDate)
      newTo = fmtDateInput(endDate)
    }

    setFilter((f: any) => ({ ...f, year: y, week: 'all', preset: 'specific_period', from: newFrom, to: newTo }))
  }

  function handleMonthChange(mStr: string) {
    if (mStr === 'all') {
      handleYearChange(filter.year || 'all')
      return
    }

    const yStr = (filter.year && filter.year !== 'all') ? filter.year : new Date().getFullYear().toString()
    const yearNum = parseInt(yStr)
    const monthNum = parseInt(mStr)
    
    const startDate = new Date(Date.UTC(yearNum, monthNum, 1))
    const newFrom = fmtDateInput(startDate)
    const newTo = fmtDateInput(getMonthEnd(startDate))

    setFilter((f: any) => ({ ...f, year: yStr, month: mStr, week: 'all', preset: 'specific_period', from: newFrom, to: newTo }))
  }

  function getSundaysInMonth(yearNum: number, monthNum: number) {
    const sundays = []
    const date = new Date(Date.UTC(yearNum, monthNum, 1))
    
    // Move to the first Sunday
    while (date.getUTCDay() !== 0) {
      date.setUTCDate(date.getUTCDate() + 1)
    }

    let weekNumber = 1
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    
    while (date.getUTCMonth() === monthNum) {
      const monday = new Date(date)
      monday.setUTCDate(monday.getUTCDate() - 6)
      
      sundays.push({
        value: weekNumber.toString(),
        label: `Week ${weekNumber} (ending Sun, ${date.getUTCDate()} ${monthNames[monthNum]})`,
        start: fmtDateInput(monday),
        end: fmtDateInput(date)
      })
      
      date.setUTCDate(date.getUTCDate() + 7)
      weekNumber++
    }
    return sundays
  }

  function handleWeekChange(wStr: string) {
    if (wStr === 'all') {
      handleMonthChange(filter.month || 'all')
      return
    }
    const yStr = (filter.year && filter.year !== 'all') ? filter.year : new Date().getFullYear().toString()
    const yearNum = parseInt(yStr)
    const monthNum = parseInt(filter.month || '0')
    const weeks = getSundaysInMonth(yearNum, monthNum)
    const selectedWeek = weeks.find(w => w.value === wStr)
    
    if (selectedWeek) {
      setFilter((f: any) => ({ ...f, year: yStr, month: filter.month, week: wStr, preset: 'specific_period', from: selectedWeek.start, to: selectedWeek.end }))
    }
  }

  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = 2026; y <= Math.max(2026, currentYear); y++) {
    years.push(y)
  }

  const months = [
    { value: '0', label: 'Jan' }, { value: '1', label: 'Feb' }, { value: '2', label: 'Mar' },
    { value: '3', label: 'Apr' }, { value: '4', label: 'May' }, { value: '5', label: 'Jun' },
    { value: '6', label: 'Jul' }, { value: '7', label: 'Aug' }, { value: '8', label: 'Sep' },
    { value: '9', label: 'Oct' }, { value: '10', label: 'Nov' }, { value: '11', label: 'Dec' },
  ]
  const displayedMonths = (filter.year === '2026' || filter.year === 'all' || !filter.year) 
    ? months.slice(3) 
    : months

  return (
    <>
      <select
        value={filter.preset}
        onChange={e => handlePresetChange(e.target.value)}
        className="bg-transparent text-white px-2 py-1 text-sm focus:outline-none"
      >
        <option value="last_week" className="bg-[#111520] text-white">Last Week</option>
        <option value="last_4_weeks" className="bg-[#111520] text-white">Last 4 Weeks</option>
        <option value="this_month" className="bg-[#111520] text-white">This Month</option>
        <option value="last_month" className="bg-[#111520] text-white">Last Month</option>
        <option value="all_time" className="bg-[#111520] text-white">All Time</option>
        <option value="custom" className="bg-[#111520] text-white">Custom Range</option>
        <option value="specific_period" className="hidden">Specific Period</option>
      </select>

      <div className="w-[1px] h-4 bg-[#1f2947] mx-1"></div>

      <select
        value={filter.year || 'all'}
        onChange={e => handleYearChange(e.target.value)}
        className="bg-transparent text-slate-300 hover:text-white px-2 py-1 text-sm focus:outline-none font-medium cursor-pointer transition-colors"
      >
        <option value="all" className="bg-[#111520] text-white">All Years</option>
        {years.map(y => (
          <option key={y} value={y} className="bg-[#111520] text-white">{y}</option>
        ))}
      </select>

      <div className="w-[1px] h-4 bg-[#1f2947] mx-1"></div>

      <select
        value={filter.month || 'all'}
        onChange={e => handleMonthChange(e.target.value)}
        className="bg-transparent text-slate-300 hover:text-white px-2 py-1 text-sm focus:outline-none font-medium cursor-pointer transition-colors"
      >
        <option value="all" className="bg-[#111520] text-white">All Months</option>
        {displayedMonths.map(m => (
          <option key={m.value} value={m.value} className="bg-[#111520] text-white">{m.label}</option>
        ))}
      </select>

      {filter.month && filter.month !== 'all' && (
        <>
          <div className="w-[1px] h-4 bg-[#1f2947] mx-1"></div>
          <select
            value={filter.week || 'all'}
            onChange={e => handleWeekChange(e.target.value)}
            className="bg-transparent text-slate-300 hover:text-white px-2 py-1 text-sm focus:outline-none font-medium cursor-pointer transition-colors"
          >
            <option value="all" className="bg-[#111520] text-white">All Weeks</option>
            {getSundaysInMonth(
              parseInt((filter.year && filter.year !== 'all') ? filter.year : new Date().getFullYear().toString()),
              parseInt(filter.month)
            ).map((w: any) => (
              <option key={w.value} value={w.value} className="bg-[#111520] text-white">{w.label}</option>
            ))}
          </select>
        </>
      )}

      {filter.preset === 'custom' && (!filter.year || filter.year === 'all') && (
        <>
          <div className="w-[1px] h-4 bg-[#1f2947] mx-1"></div>
          <input type="date" value={filter.from} onChange={e => setFilter((f: any) => ({ ...f, from: e.target.value, preset: 'custom' }))}
            className="bg-transparent text-slate-300 text-sm focus:outline-none [color-scheme:dark] cursor-pointer" />
          <span className="text-slate-500 text-xs font-semibold px-1">to</span>
          <input type="date" value={filter.to} onChange={e => setFilter((f: any) => ({ ...f, to: e.target.value, preset: 'custom' }))}
            className="bg-transparent text-slate-300 text-sm focus:outline-none [color-scheme:dark] cursor-pointer" />
        </>
      )}
    </>
  )
}
