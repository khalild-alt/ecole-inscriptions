// src/lib/useAuth.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined)
  const [profil,  setProfil]    = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) chargerProfil(data.session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) chargerProfil(session.user.id)
      else { setProfil(null); setLoading(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function chargerProfil(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profils')
      .select('*, etablissements(*)')
      .eq('id', userId)
      .single()

    if (!error) setProfil(data)
    setLoading(false)
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    // Rechargement complet pour vider le store React
    // et éviter toute contamination entre sessions
    window.location.href = window.location.origin
  }

  const value = { session, profil, loading, login, logout, chargerProfil }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
