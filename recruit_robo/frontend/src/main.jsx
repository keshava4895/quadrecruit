import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply saved display preferences before first render to avoid layout shift
;(function () {
  const fontMap = { xs: '12px', small: '14px', medium: '16px', large: '18px', xl: '20px' }
  const savedFont = localStorage.getItem('rr_font_size') || 'medium'
  document.documentElement.style.fontSize = fontMap[savedFont] || '16px'
  if (localStorage.getItem('rr_dark_mode') === 'true') {
    document.documentElement.classList.add('dark')
  }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
