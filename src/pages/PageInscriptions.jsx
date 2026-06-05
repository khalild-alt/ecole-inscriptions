// src/pages/PageInscriptions.jsx
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useApp, calculerAge, determinerNiveau } from '../store/appStore'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

function IconUpload() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function IconEdit() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}

function getNiveauLabel(niveauId, reglesAge) {
  return reglesAge.find(r => r.niveauId === niveauId)?.label || '—'
}

function getNiveauClass(niveauId) {
  const map = { annee1: 'niveau-annee1', annee2: 'niveau-annee2', annee3: 'niveau-annee3', annee4: 'niveau-annee4' }
  return map[niveauId] || 'niveau-inconnu'
}

// ── Formulaire individuel (saisie + édition) ───────────────────────────────
function FormulaireIndividuel({ eleveAEditer, onAnnulerEdition }) {
  const { config, ajouterEleve, setEleves } = useApp()
  const toast = useToast()

  // Si un élève est passé, on préremplit le formulaire
  const [form, setForm] = useState(eleveAEditer
    ? Object.fromEntries(config.champs.filter(c => c.type !== 'computed').map(c => [c.id, eleveAEditer[c.id] || '']))
    : {}
  )
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(() => {
    if (!eleveAEditer) return null
    const age = calculerAge(eleveAEditer.dateNaissance, config.modeCalculAge)
    const niveauId = determinerNiveau(age, config.reglesAge)
    return age !== null ? { age, niveauId, niveauLabel: getNiveauLabel(niveauId, config.reglesAge) } : null
  })
  const [saving, setSaving] = useState(false)

  const modeEdition = !!eleveAEditer

  function handleChange(id, val) {
    setForm(prev => ({ ...prev, [id]: val }))
    setErrors(prev => ({ ...prev, [id]: null }))
    if (id === 'dateNaissance') {
      const age = calculerAge(val, config.modeCalculAge)
      const niveauId = determinerNiveau(age, config.reglesAge)
      setPreview(age !== null ? { age, niveauId, niveauLabel: getNiveauLabel(niveauId, config.reglesAge) } : null)
    }
  }

  function valider() {
    const errs = {}
    for (const c of config.champs) {
      if (c.type === 'computed') continue
      if (c.obligatoire && !form[c.id]?.trim?.() && !form[c.id]) {
        errs[c.id] = `Le champ "${c.label}" est obligatoire`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!valider()) { toast('Veuillez remplir les champs obligatoires', 'error'); return }
    const age = calculerAge(form.dateNaissance, config.modeCalculAge)
    if (age === null) { toast('Date de naissance invalide', 'error'); return }
    if (!determinerNiveau(age, config.reglesAge)) {
      toast(`Âge ${age} ans : aucun niveau correspondant`, 'error'); return
    }

    if (modeEdition) {
      // ── Modifier un élève existant ──
      setSaving(true)
      const niveauId = determinerNiveau(age, config.reglesAge)
      const ancienNiveau = eleveAEditer.niveauId

      // Confirmer si le niveau change
      if (niveauId !== ancienNiveau) {
        const ancienLabel = getNiveauLabel(ancienNiveau, config.reglesAge)
        const nouveauLabel = getNiveauLabel(niveauId, config.reglesAge)
        if (!window.confirm(`⚠️ Attention : la modification de la date de naissance change le niveau de cet élève.\n\nAncien niveau : ${ancienLabel}\nNouveau niveau : ${nouveauLabel}\n\nConfirmez-vous ?`)) {
          setSaving(false); return
        }
      }

      const { error } = await supabase.from('eleves').update({
        donnees: form,
        age,
        niveau_id: niveauId,
        statut: 'attente', // recalcul nécessaire
        force: false,
      }).eq('id', eleveAEditer.id)

      if (error) { toast('Erreur lors de la modification : ' + error.message, 'error'); setSaving(false); return }

      setEleves(prev => prev.map(e => e.id === eleveAEditer.id
        ? { ...e, ...form, age, niveauId, statut: 'attente', force: false }
        : e
      ))
      toast(`${form.prenom || ''} ${form.nom || ''} modifié(e)`, 'success')
      onAnnulerEdition()
    } else {
      // ── Ajouter un nouvel élève ──
      await ajouterEleve(form)
      toast(`${form.prenom || ''} ${form.nom || ''} ajouté(e)`, 'success')
      setForm({})
      setPreview(null)
      setErrors({})
    }
    setSaving(false)
  }

  const champsVisibles = config.champs.filter(c => c.type !== 'computed')

  return (
    <div className="card" style={modeEdition ? { border: '2px solid var(--accent)', boxShadow: '0 0 0 4px rgba(200,64,26,0.08)' } : {}}>
      <div className="card-title">
        {modeEdition
          ? <><span>✏️</span> Modifier : {eleveAEditer.prenom} {eleveAEditer.nom}</>
          : <><span>✏️</span> Saisie individuelle</>
        }
      </div>

      {modeEdition && (
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          Vous modifiez une fiche existante. Si une allocation a déjà été calculée, elle devra être relancée.
        </div>
      )}

      <div className="grid-2">
        {champsVisibles.map(c => (
          <div className="form-group" key={c.id}>
            <label className="form-label">
              {c.label}
              {c.obligatoire && <span className="required">*</span>}
            </label>
            <input
              className={`form-input${errors[c.id] ? ' error' : ''}`}
              type={c.type === 'date' ? 'date' : 'text'}
              value={form[c.id] || ''}
              onChange={e => handleChange(c.id, e.target.value)}
              placeholder={c.type === 'date' ? '' : `${c.label}...`}
              style={{ direction: 'auto' }}
            />
            {errors[c.id] && <div className="form-error">{errors[c.id]}</div>}
          </div>
        ))}
      </div>

      {preview && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--paper)', borderRadius: 'var(--radius)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
            Âge calculé : <strong>{preview.age} ans</strong>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            ({config.modeCalculAge === 'annee' ? 'année seulement' : config.modeCalculAge === 'annee_mois' ? 'année + mois' : 'année + mois + jour'})
          </span>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>Niveau :</span>
          <span className={`niveau-tag ${getNiveauClass(preview.niveauId)}`}>
            {preview.niveauLabel || '⚠ Hors tranche'}
          </span>
        </div>
      )}

      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Enregistrement…' : modeEdition ? '💾 Enregistrer les modifications' : 'Ajouter l\'élève'}
        </button>
        <button className="btn btn-ghost" onClick={() => {
          if (modeEdition) { onAnnulerEdition() }
          else { setForm({}); setPreview(null); setErrors({}) }
        }}>
          {modeEdition ? 'Annuler' : 'Effacer'}
        </button>
      </div>
    </div>
  )
}

// ── Import Excel ───────────────────────────────────────────────────────────
function ImportExcel() {
  const { config, ajouterEleve } = useApp()
  const toast = useToast()
  const fileRef = useRef()
  const [preview, setPreview] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const mapped = rows.map((row, idx) => {
          const obj = {}
          for (const champ of config.champs.filter(c => c.type !== 'computed')) {
            const colKey = Object.keys(row).find(k => k.toLowerCase() === champ.label.toLowerCase() || k.toLowerCase() === champ.id.toLowerCase())
            if (colKey !== undefined) {
              let val = row[colKey]
              if (champ.type === 'date' && val instanceof Date) val = val.toISOString().split('T')[0]
              else if (champ.type === 'date' && typeof val === 'number') { const d = XLSX.SSF.parse_date_code(val); val = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` }
              else val = String(val || '').trim()
              obj[champ.id] = val
            }
          }
          const age = calculerAge(obj.dateNaissance, config.modeCalculAge)
          const niveauId = determinerNiveau(age, config.reglesAge)
          return { ...obj, age, niveauId, _ligne: idx + 2 }
        }).filter(r => r.prenom || r.nom)
        setPreview(mapped)
        toast(`${mapped.length} ligne(s) lue(s) — vérifiez avant d'importer`, 'info')
      } catch(err) { toast('Erreur de lecture : ' + err.message, 'error') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  function confirmerImport() {
    if (!preview) return
    let ok = 0, ko = 0
    for (const row of preview) {
      if (row.niveauId) { ajouterEleve(row); ok++ } else ko++
    }
    toast(`${ok} élève(s) importé(s)${ko > 0 ? `, ${ko} ignoré(s)` : ''}`, ok > 0 ? 'success' : 'error')
    setPreview(null)
  }

  function telechargerModele() {
    const headers = config.champs.filter(c => c.type !== 'computed').map(c => c.label)
    const ws = XLSX.utils.aoa_to_sheet([headers])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions')
    XLSX.writeFile(wb, 'modele_inscriptions.xlsx')
  }

  return (
    <div className="card">
      <div className="card-title"><span>📥</span> Import par lot (fichier Excel)</div>
      <div className="alert alert-info">Le fichier doit avoir des colonnes correspondant aux noms des champs configurés.</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={telechargerModele}>📄 Télécharger le modèle Excel</button>
        <button className="btn btn-info" onClick={() => fileRef.current?.click()}><IconUpload /> Choisir un fichier Excel</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {preview && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ligne</th>
                  {config.champs.filter(c => c.type !== 'computed').map(c => <th key={c.id}>{c.label}</th>)}
                  <th>Âge</th><th>Niveau</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(row => (
                  <tr key={row._ligne}>
                    <td style={{ color: 'var(--ink-muted)' }}>#{row._ligne}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => <td key={c.id}>{row[c.id] || '—'}</td>)}
                    <td>{row.age ?? '—'}</td>
                    <td><span className={`niveau-tag ${getNiveauClass(row.niveauId)}`}>{getNiveauLabel(row.niveauId, config.reglesAge) || '⚠ Hors tranche'}</span></td>
                    <td>{row.niveauId ? <span className="badge badge-accepte">OK</span> : <span className="badge badge-liste">Ignoré</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-success" onClick={confirmerImport}>✓ Confirmer l'import ({preview.filter(r => r.niveauId).length} élèves)</button>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>Annuler</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Liste des inscriptions ─────────────────────────────────────────────────
function ListeInscriptions({ onEditer, lectureSeule }) {
  const { config, eleves, supprimerEleve, allocation } = useApp()
  const toast = useToast()
  const [filtre, setFiltre] = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState('')

  const elevesFiltrés = eleves.filter(e => {
    const search = filtre.toLowerCase()
    const matchSearch = !filtre || (e.prenom || '').toLowerCase().includes(search) || (e.nom || '').toLowerCase().includes(search)
    const matchNiveau = !filtreNiveau || e.niveauId === filtreNiveau
    return matchSearch && matchNiveau
  })

  function confirmerSupprimer(e) {
    if (!window.confirm(`Supprimer ${e.prenom} ${e.nom} ?\n\nCette action est irréversible.`)) return
    supprimerEleve(e.id)
    toast(`${e.prenom} ${e.nom} supprimé(e)`, 'info')
  }

  function statutBadge(statut) {
    if (statut === 'accepte') return <span className="badge badge-accepte">Accepté</span>
    if (statut === 'liste_attente') return <span className="badge badge-liste">Liste d'attente</span>
    return <span className="badge badge-attente">En attente</span>
  }

  const compteurs = {}
  for (const r of config.reglesAge) {
    compteurs[r.niveauId] = eleves.filter(e => e.niveauId === r.niveauId).length
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>👥</span> Liste des demandes ({eleves.length} élève{eleves.length > 1 ? 's' : ''})
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {config.reglesAge.map(r => (
          <span key={r.niveauId} className={`chip niveau-tag ${getNiveauClass(r.niveauId)}`}>
            {r.label} : {compteurs[r.niveauId] || 0}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Rechercher par nom ou prénom..." value={filtre}
          onChange={e => setFiltre(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="form-input" value={filtreNiveau}
          onChange={e => setFiltreNiveau(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Tous les niveaux</option>
          {config.reglesAge.map(r => <option key={r.niveauId} value={r.niveauId}>{r.label}</option>)}
        </select>
      </div>

      {elevesFiltrés.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-muted)', fontSize: '1rem' }}>
          {eleves.length === 0 ? 'Aucune inscription pour le moment.' : 'Aucun résultat pour ce filtre.'}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {config.champs.filter(c => c.type !== 'computed').map(c => <th key={c.id}>{c.label}</th>)}
                <th>Âge</th>
                <th>Niveau</th>
                {allocation && <th>Statut</th>}
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {elevesFiltrés.map((e, idx) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>{idx + 1}</td>
                  {config.champs.filter(c => c.type !== 'computed').map(c => (
                    <td key={c.id} style={{ direction: 'auto' }}>{e[c.id] || '—'}</td>
                  ))}
                  <td><strong>{e.age}</strong> ans</td>
                  <td>
                    <span className={`niveau-tag ${getNiveauClass(e.niveauId)}`} style={{ direction: 'auto' }}>
                      {getNiveauLabel(e.niveauId, config.reglesAge)}
                    </span>
                  </td>
                  {allocation && <td>{statutBadge(e.statut)}</td>}
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!lectureSeule && (
                        <button className="btn btn-info btn-sm" onClick={() => onEditer(e)} title="Modifier cet élève">
                          <IconEdit />
                        </button>
                      )}
                      {!lectureSeule && (
                        <button className="btn btn-danger btn-sm" onClick={() => confirmerSupprimer(e)} title="Supprimer">
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function PageInscriptions({ lectureSeule }) {
  const [eleveAEditer, setEleveAEditer] = useState(null)

  function handleEditer(eleve) {
    setEleveAEditer(eleve)
    // Scroll vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleAnnulerEdition() {
    setEleveAEditer(null)
  }

  return (
    <div className="page">
      <h2 className="page-title">Inscriptions</h2>
      <p className="page-subtitle">Saisissez les demandes une par une ou importez un fichier Excel.</p>

      {!lectureSeule && (
        <FormulaireIndividuel
          eleveAEditer={eleveAEditer}
          onAnnulerEdition={handleAnnulerEdition}
        />
      )}

      {!lectureSeule && !eleveAEditer && <ImportExcel />}

      <ListeInscriptions onEditer={handleEditer} lectureSeule={lectureSeule} />
    </div>
  )
}
