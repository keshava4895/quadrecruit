import { createContext, useContext, useState } from 'react'

const SettingsContext = createContext(null)

const FONT_MAP = { xs: '12px', small: '14px', medium: '16px', large: '18px', xl: '20px' }

export function SettingsProvider({ children }) {
  const [fontSize, setFontSizeState] = useState(
    () => localStorage.getItem('rr_font_size') || 'medium'
  )
  const [darkMode, setDarkModeState] = useState(
    () => localStorage.getItem('rr_dark_mode') === 'true'
  )

  function setFontSize(size) {
    setFontSizeState(size)
    localStorage.setItem('rr_font_size', size)
    document.documentElement.style.fontSize = FONT_MAP[size] || '16px'
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
