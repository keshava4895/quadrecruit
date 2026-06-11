import { createContext, useContext, useState } from 'react'

const SettingsContext = createContext(null)

function loadFontSize() {
  const raw = localStorage.getItem('rr_font_size')
  const num = parseInt(raw, 10)
  const clamped = isNaN(num) ? 100 : Math.min(200, Math.max(50, num))
  // Apply immediately so the first render already has the right scale
  document.documentElement.style.setProperty('--rr-fs', String(clamped / 100))
  return clamped
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
    document.documentElement.style.setProperty('--rr-fs', String(clamped / 100))
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
