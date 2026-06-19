// src/pages/PageLogin.jsx
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/useAuth'
import { supabase } from '../lib/supabase'
import fr from '../i18n/fr'

export default function PageLogin() {
  const { login } = useAuth()
  const t = fr.commun // Login toujours en français par défaut
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [titreApp, setTitreApp] = useState(t.app_titre)

  useEffect(() => {
    supabase.from('parametres_globaux').select('valeur').eq('cle', 'nom_app_login').maybeSingle()
      .then(({ data }) => { if (data?.valeur) setTitreApp(data.valeur) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError(t.erreur_login)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2d3923', fontFamily: 'var(--font-body)' }}>
      <div style={{ background: 'var(--white)', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 400, boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏫</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--ink)', marginBottom: 6 }}>
            {titreApp}
          </h1>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{t.app_sous}</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.email}</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">{t.mot_de_passe}</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.95rem', marginTop: 8, background: '#3b4a2f' }}>
            {loading ? t.connexion_en : t.connexion}
          </button>
        </form>
      </div>
    </div>
  )
}
