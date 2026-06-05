// src/pages/PageSuperAdmin.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

// ── Formulaire établissement ────────────────────────────────
function FormulaireEtablissement({ onCreated }) {
  const toast = useToast()
  const [nom, setNom]     = useState('')
  const [ville, setVille] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!nom.trim()) { toast('Le nom est obligatoire', 'error'); return }
    setLoading(true)
    const { error } = await supabase
      .from('etablissements')
      .insert({ nom: nom.trim(), ville: ville.trim() })
    setLoading(false)
    if (error) { toast('Erreur : ' + error.message, 'error'); return }
    toast(`Établissement "${nom}" créé`, 'success')
    setNom(''); setVille('')
    onCreated()
  }

  return (
    <div className="card">
      <div className="card-title"><span>🏫</span> Nouvel établissement</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Nom <span className="required">*</span></label>
          <input className="form-input" value={nom} onChange={e => setNom(e.target.value)} placeholder="École primaire..." />
        </div>
        <div className="form-group">
          <label className="form-label">Ville</label>
          <input className="form-input" value={ville} onChange={e => setVille(e.target.value)} placeholder="Sfax..." />
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        <IconPlus /> {loading ? 'Création…' : 'Créer l\'établissement'}
      </button>
    </div>
  )
}

// ── Formulaire utilisateur ──────────────────────────────────
function FormulaireUtilisateur({ etablissements, onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '', nom: '', prenom: '', role: 'admin', etablissement_id: '' })
  const [loading, setLoading] = useState(false)

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit() {
    if (!form.email || !form.password || !form.nom) {
      toast('Email, mot de passe et nom sont obligatoires', 'error'); return
    }
    if (form.role !== 'superadmin' && !form.etablissement_id) {
      toast('Sélectionnez un établissement', 'error'); return
    }
    setLoading(true)
    try {
      // Créer l'utilisateur via Supabase Auth Admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { nom: form.nom, prenom: form.prenom, role: form.role },
      })
      if (error) throw error

      // Créer/mettre à jour le profil
      const { error: profError } = await supabase.from('profils').upsert({
        id: data.user.id,
        email: form.email,
        nom: form.nom,
        prenom: form.prenom,
        role: form.role,
        etablissement_id: form.role === 'superadmin' ? null : form.etablissement_id || null,
      })
      if (profError) throw profError

      toast(`Utilisateur ${form.email} créé`, 'success')
      setForm({ email: '', password: '', nom: '', prenom: '', role: 'admin', etablissement_id: '' })
      onCreated()
    } catch (err) {
      toast('Erreur : ' + err.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="card">
      <div className="card-title"><span>👤</span> Nouvel utilisateur</div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Prénom</label>
          <input className="form-input" value={form.prenom} onChange={e => set('prenom', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Nom <span className="required">*</span></label>
          <input className="form-input" value={form.nom} onChange={e => set('nom', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Email <span className="required">*</span></label>
          <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mot de passe <span className="required">*</span></label>
          <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Rôle</label>
          <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="admin">Admin</option>
            <option value="operateur">Opérateur</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        {form.role !== 'superadmin' && (
          <div className="form-group">
            <label className="form-label">Établissement <span className="required">*</span></label>
            <select className="form-input" value={form.etablissement_id} onChange={e => set('etablissement_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {etablissements.map(e => (
                <option key={e.id} value={e.id}>{e.nom} {e.ville ? `(${e.ville})` : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        <IconPlus /> {loading ? 'Création…' : 'Créer l\'utilisateur'}
      </button>
    </div>
  )
}

// ── Page principale SuperAdmin ───────────────────────────────
export default function PageSuperAdmin() {
  const toast = useToast()
  const [etablissements, setEtablissements] = useState([])
  const [utilisateurs, setUtilisateurs]     = useState([])
  const [loading, setLoading] = useState(true)

  async function charger() {
    setLoading(true)
    const [{ data: etabs }, { data: users }] = await Promise.all([
      supabase.from('etablissements').select('*').order('nom'),
      supabase.from('profils').select('*, etablissements(nom)').order('nom'),
    ])
    setEtablissements(etabs || [])
    setUtilisateurs(users || [])
    setLoading(false)
  }

  useEffect(() => { charger() }, [])

  async function desactiverEtablissement(id, actif) {
    await supabase.from('etablissements').update({ actif: !actif }).eq('id', id)
    charger()
  }

  const roleLabel = { superadmin: '⭐ Super Admin', admin: '🔧 Admin', operateur: '✏ Opérateur' }
  const roleBadge = { superadmin: 'badge-info', admin: 'badge-accepte', operateur: 'badge-neutral' }

  return (
    <div className="page">
      <h2 className="page-title">Administration générale</h2>
      <p className="page-subtitle">Gestion des établissements et des utilisateurs.</p>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <FormulaireEtablissement onCreated={charger} />

          <div className="card">
            <div className="card-title"><span>🏫</span> Établissements ({etablissements.length})</div>
            {loading ? <div style={{ color: 'var(--ink-muted)' }}>Chargement…</div> : (
              <table>
                <thead><tr><th>Nom</th><th>Ville</th><th>Statut</th><th></th></tr></thead>
                <tbody>
                  {etablissements.map(e => (
                    <tr key={e.id}>
                      <td><strong>{e.nom}</strong></td>
                      <td>{e.ville || '—'}</td>
                      <td>
                        <span className={`badge ${e.actif ? 'badge-accepte' : 'badge-liste'}`}>
                          {e.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${e.actif ? 'btn-ghost' : 'btn-success'}`}
                          onClick={() => desactiverEtablissement(e.id, e.actif)}
                        >
                          {e.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <FormulaireUtilisateur etablissements={etablissements} onCreated={charger} />

          <div className="card">
            <div className="card-title"><span>👥</span> Utilisateurs ({utilisateurs.length})</div>
            {loading ? <div style={{ color: 'var(--ink-muted)' }}>Chargement…</div> : (
              <table>
                <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Établissement</th></tr></thead>
                <tbody>
                  {utilisateurs.map(u => (
                    <tr key={u.id}>
                      <td>{u.prenom} {u.nom}</td>
                      <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                      <td><span className={`badge ${roleBadge[u.role] || 'badge-neutral'}`}>{roleLabel[u.role] || u.role}</span></td>
                      <td style={{ fontSize: '0.82rem' }}>{u.etablissements?.nom || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
