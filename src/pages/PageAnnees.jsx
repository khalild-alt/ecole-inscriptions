// src/pages/PageAnnees.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { useToast } from '../components/Toast'
import { useI18n, interpoler } from '../i18n/useI18n'
import { DEFAULT_CONFIG } from '../store/appStore'

export default function PageAnnees({ onSelectAnnee }) {
  const { profil } = useAuth()
  const { t, isRtl } = useI18n()
  const toast = useToast()
  const ta = t.annees
  const [annees, setAnnees] = useState([])
  const [loading, setLoading] = useState(true)
  const [nouvLabel, setNouvLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [showNouvelleAnnee, setShowNouvelleAnnee] = useState(false)

  const etabId = profil?.etablissement_id
  const isAdmin = profil?.role === 'admin' || profil?.role === 'superadmin'
  const nomEtab = profil?.etablissements?.nom_affichage || profil?.etablissements?.nom || ''

  async function charger() {
    setLoading(true)
    const { data } = await supabase.from('annees_scolaires').select('*').eq('etablissement_id', etabId).order('created_at', { ascending: false })
    setAnnees(data || [])
    setLoading(false)
  }

  useEffect(() => { if (etabId) charger() }, [etabId])

  async function creerAnnee() {
    if (!nouvLabel.trim()) { toast(ta.libelle, 'error'); return }
    setCreating(true)
    const { data: annee, error } = await supabase.from('annees_scolaires').insert({ etablissement_id: etabId, label: nouvLabel.trim(), statut: 'ouverte' }).select().single()
    if (error) { toast('Erreur : ' + error.message, 'error'); setCreating(false); return }

    const derniereAnnee = annees[0]
    if (derniereAnnee) {
      const { data: cfgSrc } = await supabase.from('configurations').select('*').eq('annee_id', derniereAnnee.id).single()
      if (cfgSrc) {
        await supabase.from('configurations').insert({
          annee_id: annee.id, salles: cfgSrc.salles, regles_age: cfgSrc.regles_age,
          mode_calcul_age: cfgSrc.mode_calcul_age, mode_allocation_defaut: cfgSrc.mode_allocation_defaut || 'B',
          champs: cfgSrc.champs, noms_onglets: cfgSrc.noms_onglets || DEFAULT_CONFIG.nomsOnglets,
          langue: cfgSrc.langue || 'fr',
        })
      }
    } else {
      await supabase.from('configurations').insert({
        annee_id: annee.id, salles: DEFAULT_CONFIG.salles, regles_age: DEFAULT_CONFIG.reglesAge,
        mode_calcul_age: DEFAULT_CONFIG.modeCalculAge, mode_allocation_defaut: 'B',
        champs: DEFAULT_CONFIG.champs, noms_onglets: DEFAULT_CONFIG.nomsOnglets, langue: 'fr',
      })
    }
    toast(`"${nouvLabel}" ${ta.creer}`, 'success')
    setNouvLabel(''); setShowNouvelleAnnee(false); charger(); setCreating(false)
  }

  async function archiverAnnee(id, label) {
    if (!window.confirm(interpoler(ta.confirm_archiver, { label }))) return
    await supabase.from('annees_scolaires').update({ statut: 'archivee' }).eq('id', id)
    toast(label + ' archivée', 'info'); charger()
  }

  async function rouvrirAnnee(id, label) {
    if (!window.confirm(interpoler(ta.confirm_rouvrir, { label }))) return
    await supabase.from('annees_scolaires').update({ statut: 'ouverte' }).eq('id', id)
    toast(label + ' réouverte', 'success'); charger()
  }

  const anneesSugg = () => { const y = new Date().getFullYear(); return [`${y}-${y+1}`, `${y+1}-${y+2}`] }
  const anneeOuverte = annees.find(a => a.statut === 'ouverte')
  const anneesArchivees = annees.filter(a => a.statut === 'archivee')
  const hasArabicNom = /[\u0600-\u06FF]/.test(nomEtab)

  return (
    <div className="page">
      <h2 className="page-title">{ta.titre}</h2>
      <p className="page-subtitle" style={{ direction: hasArabicNom ? 'rtl' : 'ltr' }}>
        <span style={{ fontFamily: hasArabicNom ? "'Noto Sans Arabic',sans-serif" : 'inherit' }}>{nomEtab}</span>
        {' — '}{ta.sous_titre}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-muted)', fontSize: '1.1rem' }}>{t.commun.chargement}</div>
      ) : (
        <>
          {anneeOuverte ? (
            <div className="annee-card-principale">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ background: 'var(--success)', color: 'white', borderRadius: 6, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {ta.en_cours}
                    </span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--ink)', marginBottom: 4 }}>
                    {anneeOuverte.alias || anneeOuverte.label}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                    {new Date(anneeOuverte.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {isAdmin && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}
                      onClick={() => archiverAnnee(anneeOuverte.id, anneeOuverte.label)}>
                      {ta.archiver}
                    </button>
                  )}
                  <button className="btn btn-primary btn-xl" onClick={() => onSelectAnnee(anneeOuverte)}>
                    {ta.editer}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning">{ta.aucune_annee}</div>
          )}

          {anneesArchivees.length > 0 && (
            <div style={{ marginTop: 24, marginBottom: 8 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                {ta.archives} ({anneesArchivees.length})
              </div>
              {anneesArchivees.map(a => (
                <div key={a.id} className="annee-card-archive">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--ink-light)', marginBottom: 2 }}>
                        🔒 {a.alias || a.label}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                        {new Date(a.created_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isAdmin && <button className="btn btn-success btn-sm" onClick={() => rouvrirAnnee(a.id, a.label)}>{ta.rouvrir}</button>}
                      <button className="btn btn-secondary btn-sm" onClick={() => onSelectAnnee(a)}>{ta.consulter}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAdmin && (
            <div style={{ marginTop: 32, borderTop: '2px dashed var(--paper3)', paddingTop: 24 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNouvelleAnnee(!showNouvelleAnnee)} style={{ marginBottom: 16 }}>
                {showNouvelleAnnee ? ta.masquer : ta.nouvelle_annee}
              </button>
              {showNouvelleAnnee && (
                <div className="card" style={{ border: '2px dashed var(--paper3)', background: 'var(--paper)' }}>
                  <div className="card-title">📅 {ta.nouvelle_annee}</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
                      <label className="form-label">{ta.libelle} <span className="required">*</span></label>
                      <input className="form-input" value={nouvLabel} onChange={e => setNouvLabel(e.target.value)} placeholder="ex : 2026-2027" onKeyDown={e => e.key === 'Enter' && creerAnnee()} />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {anneesSugg().map(s => <button key={s} className="btn btn-ghost btn-sm" onClick={() => setNouvLabel(s)}>{s}</button>)}
                    </div>
                    <button className="btn btn-primary" onClick={creerAnnee} disabled={creating}>
                      {creating ? ta.creation : ta.creer}
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{ta.copie_auto}</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
