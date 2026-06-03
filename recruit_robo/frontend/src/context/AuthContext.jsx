import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('rr_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  function login(userData, token) {
    localStorage.setItem('rr_user',  JSON.stringify(userData))
    localStorage.setItem('rr_token', token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('rr_user')
    localStorage.removeItem('rr_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
