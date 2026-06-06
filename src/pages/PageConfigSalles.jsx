// src/pages/PageConfigSalles.jsx
import { useState } from 'react'
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n, interpoler } from '../i18n/useI18n'

function IconPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

function SectionSalles({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const { t } = useI18n()
  const toast = useToast()
  const cs = t.config_salles

  function majSalle(id, champ, val) {
    setConfig(prev => ({ ...prev, salles: prev.salles.map(s => s.id === id ? { ...s, [champ]: champ === 'capacite' ? parseInt(val) || 0 : val } : s) }))
  }

  function ajouterSalle() {
    const newId = `s${Date.now()}`
    setConfig(prev => ({ ...prev, salles: [...prev.salles, { id: newId, nom: `S${prev.salles.length + 1}`, capacite: 20 }] }))
  }

  function supprimerSalle(id, nom) {
    if (config.salles.length <= 1) { toast(cs.ajouter_salle, 'error'); return }
    if (!window.confirm(interpoler(cs.confirm_suppr, { nom }))) return
    setConfig(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== id) }))
  }

  const capaciteTotale = config.salles.reduce((s, sl) => s + (sl.capacite || 0), 0)

  return (
    <div className="card">
      <div className="card-title">🏫 {cs.section_salles}</div>
      {lectureSeule && <div className="alert alert-warning">{cs.lecture_seule}</div>}
      <table>
        <thead>
          <tr><th>{cs.nom_salle}</th><th>Nom complet (affiché)</th><th>{cs.capacite}</th>{!lectureSeule && <th style={{ width: 60 }}></th>}</tr>
        </thead>
        <tbody>
          {config.salles.map(s => (
            <tr key={s.id}>
              <td><input className="form-input" value={s.nom} disabled={lectureSeule} onChange={e => majSalle(s.id, 'nom', e.target.value)} style={{ width: 80 }} /></td>
              <td><input className="form-input" value={s.nomComplet || ''} disabled={lectureSeule} onChange={e => majSalle(s.id, 'nomComplet', e.target.value)} placeholder={`ex: Salle du bas`} style={{ width: 180, direction: 'auto' }} /></td>
              <td><input className="form-input" type="number" min={1} value={s.capacite} disabled={lectureSeule} onChange={e => majSalle(s.id, 'capacite', e.target.value)} style={{ width: 90 }} /></td>
              {!lectureSeule && <td><button className="btn btn-danger btn-sm" onClick={() => supprimerSalle(s.id, s.nom)}><IconTrash /></button></td>}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} style={{ fontWeight: 600, color: 'var(--ink-light)', paddingTop: 12 }}>
              {cs.total_salles} : {config.salles.length} {config.salles.length > 1 ? cs.salles : cs.salle}
            </td>
            <td style={{ paddingTop: 12 }}><span className="badge badge-info">{capaciteTotale} {cs.places}</span></td>
            {!lectureSeule && <td></td>}
          </tr>
        </tfoot>
      </table>
      {!lectureSeule && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={ajouterSalle}><IconPlus /> {cs.ajouter_salle}</button>
        </div>
      )}
    </div>
  )
}

function SectionModeCalculAge({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const { t } = useI18n()
  const cs = t.config_salles
  const modes = [
    { id: 'annee',         label: cs.mode_annee,  desc: cs.mode_annee_desc,  ex: cs.mode_annee_ex },
    { id: 'annee_mois',    label: cs.mode_mois,   desc: cs.mode_mois_desc,   ex: cs.mode_mois_ex },
    { id: 'annee_mois_jour', label: cs.mode_jour, desc: cs.mode_jour_desc,   ex: cs.mode_jour_ex },
  ]
  return (
    <div className="card">
      <div className="card-title">🎂 {cs.section_age}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modes.map(m => (
          <label key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 'var(--radius)', border: `2px solid ${config.modeCalculAge === m.id ? 'var(--accent)' : 'var(--paper3)'}`, background: config.modeCalculAge === m.id ? 'rgba(200,64,26,0.04)' : 'var(--white)', cursor: lectureSeule ? 'default' : 'pointer' }}>
            <input type="radio" name="modeCalculAge" value={m.id} checked={config.modeCalculAge === m.id} disabled={lectureSeule}
              onChange={() => !lectureSeule && setConfig(prev => ({ ...prev, modeCalculAge: m.id }))}
              style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3 }}>
                {m.label}
                {m.id === 'annee' && <span style={{ marginLeft: 8, fontSize: '0.72rem', background: 'var(--paper2)', padding: '1px 7px', borderRadius: 10, color: 'var(--ink-muted)' }}>{cs.defaut}</span>}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', marginBottom: 3 }}>{m.desc}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>{m.ex}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function SectionReglesAge({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const { t } = useI18n()
  const toast = useToast()
  const cs = t.config_salles

  function majRegle(id, champ, val) {
    setConfig(prev => ({ ...prev, reglesAge: prev.reglesAge.map(r => r.id === id ? { ...r, [champ]: ['ageMin','ageMax'].includes(champ) ? parseInt(val)||0 : val } : r) }))
  }

  function ajouterRegle() {
    const newId = `r${Date.now()}`
    const nextNum = config.reglesAge.length + 1
    setConfig(prev => ({ ...prev, reglesAge: [...prev.reglesAge, { id: newId, niveauId: `annee${nextNum}`, label: `Année ${nextNum}`, ageMin: 6, ageMax: 6 }] }))
  }

  function supprimerRegle(id, label) {
    if (config.reglesAge.length <= 1) { toast('Il faut au moins un niveau', 'error'); return }
    if (!window.confirm(interpoler(cs.confirm_niveau, { label }))) return
    setConfig(prev => ({ ...prev, reglesAge: prev.reglesAge.filter(r => r.id !== id) }))
  }

  return (
    <div className="card">
      <div className="card-title">📅 {cs.section_regles}</div>
      <div className="alert alert-info">{cs.info_regles}</div>
      <table>
        <thead><tr><th>{cs.identifiant}</th><th>{cs.libelle_affiche}</th><th>{cs.age_min}</th><th>{cs.age_max}</th>{!lectureSeule && <th style={{ width: 60 }}></th>}</tr></thead>
        <tbody>
          {config.reglesAge.map(r => (
            <tr key={r.id}>
              <td><input className="form-input" value={r.niveauId} disabled={lectureSeule} onChange={e => majRegle(r.id, 'niveauId', e.target.value)} style={{ width: 110, fontFamily: 'monospace', fontSize: '0.82rem' }} /></td>
              <td><input className="form-input" value={r.label} disabled={lectureSeule} onChange={e => majRegle(r.id, 'label', e.target.value)} style={{ width: 150, direction: 'auto' }} /></td>
              <td><input className="form-input" type="number" min={1} max={25} value={r.ageMin} disabled={lectureSeule} onChange={e => majRegle(r.id, 'ageMin', e.target.value)} style={{ width: 70 }} /></td>
              <td><input className="form-input" type="number" min={1} max={25} value={r.ageMax} disabled={lectureSeule} onChange={e => majRegle(r.id, 'ageMax', e.target.value)} style={{ width: 70 }} /></td>
              {!lectureSeule && <td><button className="btn btn-danger btn-sm" onClick={() => supprimerRegle(r.id, r.label)}><IconTrash /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!lectureSeule && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={ajouterRegle}><IconPlus /> {cs.ajouter_niveau}</button>
        </div>
      )}
    </div>
  )
}

function SectionModeOptimisation({ lectureSeule }) {
  const { config, setConfig, setModeAllocation } = useApp()
  const { t } = useI18n()
  const cs = t.config_salles

  function changer(mode) {
    setModeAllocation(mode)
    setConfig(prev => ({ ...prev, modeAllocationDefaut: mode }))
  }

  return (
    <div className="card">
      <div className="card-title">⚙️ {cs.section_optim}</div>
      <div className="alert alert-info">{cs.info_optim}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { id: 'B', label: cs.mode_b, desc: cs.mode_b_desc },
          { id: 'A', label: cs.mode_a, desc: cs.mode_a_desc },
        ].map(m => (
          <label key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 'var(--radius)', border: `2px solid ${(config.modeAllocationDefaut||'B') === m.id ? 'var(--accent)' : 'var(--paper3)'}`, background: (config.modeAllocationDefaut||'B') === m.id ? 'rgba(200,64,26,0.04)' : 'var(--white)', cursor: lectureSeule ? 'default' : 'pointer' }}>
            <input type="radio" name="modeAlloc" value={m.id} checked={(config.modeAllocationDefaut||'B') === m.id} disabled={lectureSeule}
              onChange={() => !lectureSeule && changer(m.id)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>{m.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function PageConfigSalles({ lectureSeule }) {
  const { chargerDonneesTest } = useApp()
  const { t } = useI18n()
  const toast = useToast()
  const cs = t.config_salles

  async function loadTest() {
    if (!window.confirm('Charger les données de test ?')) return
    await chargerDonneesTest()
    toast('Données de test chargées', 'success')
  }

  return (
    <div className="page">
      <h2 className="page-title">{cs.titre}</h2>
      <p className="page-subtitle">{cs.sous_titre}</p>
      {!lectureSeule && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <button className="btn btn-warning" onClick={loadTest}>{cs.charger_test}</button>
        </div>
      )}
      <SectionSalles lectureSeule={lectureSeule} />
      <SectionModeCalculAge lectureSeule={lectureSeule} />
      <SectionReglesAge lectureSeule={lectureSeule} />
      <SectionModeOptimisation lectureSeule={lectureSeule} />
    </div>
  )
}
