'use client'
import { useState, useRef, useEffect } from 'react'

export interface PlatformOption {
  value: string;
  label: string;
  color?: string;
}

const DEFAULT_PLATFORMS: PlatformOption[] = [
  { value: 'Deliveroo', label: 'Deliveroo', color: '#4f8ef7' },
  { value: 'Just Eat', label: 'Just Eat', color: '#f97316' },
  { value: 'Uber Eats', label: 'Uber Eats', color: '#22d3a5' },
  { value: 'Herbies POS', label: 'Herbies POS', color: '#ef4444' },
  { value: 'Herbies Web & App', label: 'Herbies Web & App', color: '#ec4899' },
  { value: 'Tasty Bun POS', label: 'Tasty Bun POS', color: '#f59e0b' },
  { value: 'Tasty Bun Website', label: 'Tasty Bun Website', color: '#e11d48' },
  { value: 'Tasty Bun Mobile App', label: 'Tasty Bun Mobile App', color: '#a855f7' },
]

interface MultiPlatformFilterProps {
  selectedPlatforms: string; // comma-separated or single string or empty for all
  onChange: (newPlatformStr: string) => void;
  options?: PlatformOption[];
}

export default function MultiPlatformFilter({
  selectedPlatforms,
  onChange,
  options = DEFAULT_PLATFORMS
}: MultiPlatformFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Convert comma-separated string to Array
  const currentArray = selectedPlatforms ? selectedPlatforms.split(',').map(s => s.trim()).filter(Boolean) : []

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isAllSelected = currentArray.length === 0 || currentArray.length === options.length

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange('') // Clear selection (All Platforms)
    } else {
      onChange('') // All Platforms
    }
  }

  const handleToggleOption = (value: string) => {
    let nextArray: string[] = []
    if (currentArray.includes(value)) {
      nextArray = currentArray.filter(v => v !== value)
    } else {
      nextArray = [...currentArray, value]
    }

    if (nextArray.length === 0 || nextArray.length === options.length) {
      onChange('')
    } else {
      onChange(nextArray.join(','))
    }
  }

  // Trigger label text
  const getTriggerLabel = () => {
    if (currentArray.length === 0 || currentArray.length === options.length) {
      return 'All Platforms'
    }
    if (currentArray.length === 1) {
      const match = options.find(o => o.value === currentArray[0])
      return match ? match.label : currentArray[0]
    }
    return `${currentArray.length} Platforms Selected`
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#0a0c14] border border-[#1f2947] hover:border-blue-500/50 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer"
      >
        <span className="text-sm opacity-80">📱</span>
        <span>{getTriggerLabel()}</span>
        {!isAllSelected && (
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {currentArray.length}
          </span>
        )}
        <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Custom Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-[#111520] border border-[#1f2947] rounded-2xl shadow-2xl z-50 p-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1.5 flex items-center justify-between border-b border-[#1f2947]/60 mb-2">
            <span>Filter Platforms</span>
            {currentArray.length > 0 && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="text-blue-400 hover:text-blue-300 font-bold lowercase text-[11px]"
              >
                reset
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {/* All Platforms option */}
            <label
              onClick={handleToggleAll}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                isAllSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-300 hover:bg-[#161b2c]'
              }`}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {}}
                className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1a2235] text-blue-500 focus:ring-blue-500 cursor-pointer"
              />
              <span>All Platforms</span>
            </label>

            {/* Individual Platform Options */}
            {options.map((opt) => {
              const isChecked = currentArray.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  onClick={(e) => {
                    e.preventDefault()
                    handleToggleOption(opt.value)
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    isChecked ? 'bg-blue-500/10 text-white border border-blue-500/20' : 'text-slate-300 hover:bg-[#161b2c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-[#2d3b5e] bg-[#1a2235] text-blue-500 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="flex items-center gap-2">
                      {opt.color && (
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: opt.color }}></span>
                      )}
                      {opt.label}
                    </span>
                  </div>
                  {isChecked && <span className="text-blue-400 text-xs font-bold">✓</span>}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
