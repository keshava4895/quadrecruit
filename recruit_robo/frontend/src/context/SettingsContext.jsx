import { createContext, useContext, useState } from 'react'

const SettingsContext = createContext(null)

function loadFontSize() {
  const raw = localStorage.getItem('rr_font_size')
  if (!raw) return 100
  const num = parseInt(raw, 10)
  // Migrate legacy named keys → 100%
  if (isNaN(num)) return 100
  return Math.min(200, Math.max(50, num))
}

export function SettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(loadFontSize)
  const [darkMode, setDarkModeState] = useState(
    () => localStorage.getItem('rr_dark_mode') === 'true'
  )

  function setFontSize(pct) {
    const clamped = Math.min(200, Math.max(50, Math.round(pct)))
    setFontSizeState(clamped)
    localStorage.setItem('rr_font_size', String(clamped))
    document.documentElement.style.fontSize = clamped + '%'
  }

  function setDarkMode(val) {
    setDarkModeState(val)
    localStorage.setItem('rr_dark_mode', String(val))
    document.documentElement.classList.toggle('dark', val)
  }

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, darkMode, setDarkMode }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
