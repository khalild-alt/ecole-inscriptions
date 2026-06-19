import React, { useState, useRef, useEffect } from 'react'
import ScrollArrows from '../components/ScrollArrows'
// src/pages/PageInscriptions.jsx
import * as XLSX from 'xlsx'
import { useApp, calculerAge, determinerNiveau } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n, interpoler } from '../i18n/useI18n'
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

function FormulaireIndividuel({ eleveAEditer, onAnnulerEdition }) {
  const { config, ajouterEleve, setEleves, incrementerModifs, eleves, annee } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const ti = t.inscriptions

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

  // Resynchronise le formulaire quand eleveAEditer change (ouvrir une autre édition)
  useEffect(() => {
    if (eleveAEditer) {
      setForm(Object.fromEntries(config.champs.filter(c => c.type !== 'computed').map(c => [c.id, eleveAEditer[c.id] || ''])))
      const age = calculerAge(eleveAEditer.dateNaissance, config.modeCalculAge)
      const niveauId = determinerNiveau(age, config.reglesAge)
      setPreview(age !== null ? { age, niveauId, niveauLabel: getNiveauLabel(niveauId, config.reglesAge) } : null)
      setErrors({})
    } else {
      setForm({})
      setPreview(null)
      setErrors({})
    }
  }, [eleveAEditer])

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
      // Vérification champ obligatoire — compatible text ET number
      const valBrut = form[c.id]
      const estVide = valBrut === undefined || valBrut === null || String(valBrut).trim() === ''
      if (c.obligatoire && estVide) {
        errs[c.id] = `${c.label} ${t.commun.obligatoire}`
      }
      // Vérifier que l'identifiant est un entier valide si renseigné
      if (c.id === 'identifiant' && !estVide) {
        const val = String(valBrut).trim()
        if (!/^\d+$/.test(val)) {
          errs[c.id] = langue === 'ar' ? 'يجب أن يكون المعرف رقماً صحيحاً' : "L'identifiant doit être un nombre entier"
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!valider()) { toast(langue === 'ar' ? 'تحقق من الحقول المطلوبة' : 'Vérifiez les champs obligatoires', 'error'); return }
    const age = calculerAge(form.dateNaissance, config.modeCalculAge)
    if (age === null) { toast('Date invalide', 'error'); return }
    if (!determinerNiveau(age, config.reglesAge)) { toast(ti.hors_tranche, 'error'); return }

    // Vérification unicité identifiant en base (source de vérité)
    const valIdRaw = form.identifiant
    if (valIdRaw !== undefined && valIdRaw !== null && String(valIdRaw).trim() !== '') {
      const valId = String(valIdRaw).trim()
      if (annee?.id) {
        const { data: tousEleves, error: errFetch } = await supabase
          .from('eleves')
          .select('id, donnees')
          .eq('annee_id', annee.id)
        if (!errFetch && tousEleves) {
          const doublon = tousEleves.find(e => {
            if (modeEdition && e.id === eleveAEditer?.id) return false
            const eId = e.donnees?.identifiant
            if (eId === undefined || eId === null || eId === '') return false
            return String(eId).trim() === valId
          })
          if (doublon) {
            const d = doublon.donnees
            const msg = langue === 'ar'
              ? `المعرف ${valId} مستخدم بالفعل`
              : `Identifiant ${valId} déjà utilisé — ${d?.prenom || ''} ${d?.nom || ''}`
            setErrors(prev => ({ ...prev, identifiant: msg }))
            toast(msg, 'error')
            return
          }
        }
      }
    }

    // Vérification unicité numéroRecu
    const valRecuRaw = form.numeroRecu
    if (valRecuRaw !== undefined && valRecuRaw !== null && String(valRecuRaw).trim() !== '') {
      const valRecu = String(valRecuRaw).trim()
      if (annee?.id) {
        const { data: tousElevesRecu } = await supabase
          .from('eleves')
          .select('id, donnees')
          .eq('annee_id', annee.id)
        if (tousElevesRecu) {
          const doublonRecu = tousElevesRecu.find(e => {
            if (modeEdition && e.id === eleveAEditer?.id) return false
            const eId = e.donnees?.numeroRecu
            if (eId === undefined || eId === null || eId === '') return false
            return String(eId).trim() === valRecu
          })
          if (doublonRecu) {
            const d = doublonRecu.donnees
            const msg = langue === 'ar'
              ? `رقم الوصل ${valRecu} مستخدم بالفعل`
              : `Numéro reçu ${valRecu} déjà utilisé — ${d?.prenom || ''} ${d?.nom || ''}`
            setErrors(prev => ({ ...prev, numeroRecu: msg }))
            toast(msg, 'error')
            return
          }
        }
      }
    }

    if (modeEdition) {
      setSaving(true)
      const niveauId = determinerNiveau(age, config.reglesAge)
      const ancienNiveau = eleveAEditer.niveauId
      if (niveauId !== ancienNiveau) {
        if (!window.confirm(interpoler(ti.confirm_niveau, { ancien: getNiveauLabel(ancienNiveau, config.reglesAge), nouveau: getNiveauLabel(niveauId, config.reglesAge) }))) {
          setSaving(false); return
        }
      }
      const { error } = await supabase.from('eleves').update({ donnees: form, age, niveau_id: niveauId, statut: 'attente', force: false }).eq('id', eleveAEditer.id)
      if (error) { toast('Erreur : ' + error.message, 'error'); setSaving(false); return }
      setEleves(prev => prev.map(e => e.id === eleveAEditer.id ? { ...e, ...form, age, niveauId, statut: 'attente', force: false } : e))
      toast(`${form.prenom || ''} ${form.nom || ''} modifié(e)`, 'success')
      onAnnulerEdition()
    } else {
      await ajouterEleve(form)
      toast(`${form.prenom || ''} ${form.nom || ''} ajouté(e)`, 'success')
      setForm({}); setPreview(null); setErrors({})
      incrementerModifs()
    }
    setSaving(false)
  }

  const modeLabel = config.modeCalculAge === 'annee' ? t.config_salles.mode_annee : config.modeCalculAge === 'annee_mois' ? t.config_salles.mode_mois : t.config_salles.mode_jour

  return (
    <div className="card" style={modeEdition ? { border: '2px solid var(--accent)', boxShadow: '0 0 0 4px rgba(200,64,26,0.08)' } : {}}>
      <div className="card-title">
        {modeEdition ? <><span>✏️</span> {ti.section_modifier} : {eleveAEditer.prenom} {eleveAEditer.nom}</> : <><span>✏️</span> {ti.section_saisie}</>}
      </div>
      {modeEdition && <div className="alert alert-warning">{ti.alert_modifier}</div>}
      <div className="grid-2">
        {config.champs.filter(c => c.type !== 'computed').map(c => (
          <div className="form-group" key={c.id}>
            <label className="form-label" style={{ direction: 'auto' }}>
              {c.label}{c.obligatoire && <span className="required">*</span>}
            </label>
            <input className={`form-input${errors[c.id] ? ' error' : ''}`} type={c.type === 'date' ? 'date' : 'text'}
              value={form[c.id] || ''} onChange={e => handleChange(c.id, e.target.value)}
              placeholder={c.type === 'date' ? '' : `${c.label}...`} style={{ direction: 'auto' }} />
            {errors[c.id] && <div className="form-error">{errors[c.id]}</div>}
          </div>
        ))}
      </div>
      {preview && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--paper)', borderRadius: 'var(--radius)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>{ti.age_calcule} : <strong>{preview.age} {t.inscriptions.ans}</strong></span>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>({modeLabel})</span>
          <span style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>{ti.niveau_attribue}</span>
          <span className={`niveau-tag ${getNiveauClass(preview.niveauId)}`} style={{ direction: 'auto' }}>
            {preview.niveauLabel || ti.hors_tranche}
          </span>
        </div>
      )}
      <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? ti.enregistrement : modeEdition ? ti.enregistrer : ti.ajouter}
        </button>
        <button className="btn btn-ghost" onClick={() => { if (modeEdition) onAnnulerEdition(); else { setForm({}); setPreview(null); setErrors({}) } }}>
          {modeEdition ? ti.annuler : ti.effacer}
        </button>
      </div>
    </div>
  )
}

function ImportExcel() {
  const { config, ajouterElevesBatch } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const fileRef = useRef()
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const ti = t.inscriptions

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
        // Trier par ordre de ligne du fichier pour respecter l'ordre d'import
        mapped.sort((a, b) => a._ligne - b._ligne)
        setPreview(mapped)
        toast(`\${mapped.length} ligne(s) lue(s) — cliquez sur Confirmer pour importer`, 'info')
      } catch(err) { toast('Erreur : ' + err.message, 'error') }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  async function confirmerImport() {
    if (!preview || importing) return
    setImporting(true)
    const valides = preview.filter(r => r.niveauId)
    const rejetes = preview.filter(r => !r.niveauId)
    try {
      await ajouterElevesBatch(valides)
      if (rejetes.length > 0) {
        const wb = XLSX.utils.book_new()
        const headers = ['Ligne fichier', ...config.champs.filter(c => c.type !== 'computed').map(c => c.label), 'Âge calculé', 'Raison du rejet']
        const rows = rejetes.map(r => [
          r._ligne,
          ...config.champs.filter(c => c.type !== 'computed').map(c => r[c.id] || ''),
          r.age ?? '',
          r.age === null ? 'Date de naissance invalide' : 'Âge ' + r.age + ' ans hors tranche configurée',
        ])
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = headers.map(() => ({ wch: 20 }))
        XLSX.utils.book_append_sheet(wb, ws, 'Non importés')
        XLSX.writeFile(wb, 'eleves-non-importes.xlsx')
        toast(valides.length + ' importé(s) · ' + rejetes.length + ' non importé(s) → fichier Excel généré', 'info')
      } else {
        toast(valides.length + ' élève(s) importé(s)', 'success')
      }
      setPreview(null)
    } catch(err) {
      toast('Erreur import : ' + err.message, 'error')
    }
    setImporting(false)
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
      <div className="card-title"><span>📥</span> {ti.section_import}</div>
      <div className="alert alert-info">{ti.info_import}</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={telechargerModele}>{ti.modele}</button>
        <button className="btn btn-info" onClick={() => fileRef.current?.click()}><IconUpload /> {ti.choisir_fichier}</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {preview && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{ti.col_num}</th>
                  {config.champs.filter(c => c.type !== 'computed').map(c => <th key={c.id} style={{ direction: 'auto' }}>{c.label}</th>)}
                  <th>{ti.col_age}</th><th>{ti.col_niveau}</th><th>{ti.col_statut}</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(row => (
                  <tr key={row._ligne}>
                    <td style={{ color: 'var(--ink-muted)' }}>#{row._ligne}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => <td key={c.id} style={{ direction: 'auto' }}>{row[c.id] || '—'}</td>)}
                    <td>{row.age ?? '—'}</td>
                    <td><span className={`niveau-tag ${getNiveauClass(row.niveauId)}`} style={{ direction: 'auto' }}>{getNiveauLabel(row.niveauId, config.reglesAge) || ti.hors_tranche}</span></td>
                    <td>{row.niveauId ? <span className="badge badge-accepte">OK</span> : <span className="badge badge-liste">Ignoré</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-success" onClick={confirmerImport} disabled={importing}>
              {importing ? `Import en cours… (${preview.filter(r => r.niveauId).length} élèves)` : interpoler(ti.confirmer_import, { n: preview.filter(r => r.niveauId).length })}
            </button>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>{ti.annuler_import}</button>
          </div>
        </>
      )}
    </div>
  )
}

function ListeInscriptions({ onEditer, lectureSeule }) {
  const { config, eleves, supprimerEleve, allocation } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const ti = t.inscriptions
  const [filtre, setFiltre] = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState('')

  function exporterExcel() {
    const wb = XLSX.utils.book_new()
    const champs = config.champs.filter(c => c.type !== 'computed')
    const headers = ['#', ...champs.map(c => c.label), 'Âge', 'Niveau', 'Statut']
    if (allocation) headers.push('Salle')
    const rows = elevesFiltrés.map((e, idx) => {
      const row = [idx + 1, ...champs.map(c => e[c.id] || ''), e.age || '', config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || '']
      const statut = e.statut === 'accepte' ? 'Accepté' : e.statut === 'liste_attente' ? "Liste d'attente" : 'En attente'
      row.push(statut)
      if (allocation) {
        const res = allocation.affectations[e.niveauId]
        const cls = res?.classes?.find(c => c.elevesIds?.includes(e.id))
        row.push(cls?.salle?.nomComplet || cls?.salle?.nom || (e.statut === 'accepte' ? res?.salle?.nom || '—' : '—'))
      }
      return row
    })
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Inscrits')
    XLSX.writeFile(wb, `inscrits_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.xlsx`)
    toast('Export généré', 'success')
  }
  const champsFiltres = config.champs.filter(c => c.type !== 'computed')
  const nbCols = 1 + champsFiltres.length + 2 + (allocation ? 2 : 0) + 1
  const [colWidths, setColWidths] = useState(() => Array(20).fill(null))
  const resizingRef = React.useRef(null)

  function startResize(idx, e) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[idx] || e.target.closest('th').offsetWidth
    resizingRef.current = idx

    function onMove(ev) {
      const delta = ev.clientX - startX
      const newW = Math.max(30, startW + delta)
      setColWidths(prev => { const n = [...prev]; n[idx] = newW; return n })
    }
    function onUp() {
      resizingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const elevesFiltrés = eleves.filter(e => {
    const search = filtre.toLowerCase()
    const matchSearch = !filtre || (e.prenom || '').toLowerCase().includes(search) || (e.nom || '').toLowerCase().includes(search)
    const matchNiveau = !filtreNiveau || e.niveauId === filtreNiveau
    return matchSearch && matchNiveau
  })

  function confirmerSupprimer(e) {
    if (!window.confirm(interpoler(ti.confirm_suppr, { prenom: e.prenom, nom: e.nom }))) return
    supprimerEleve(e.id)
    toast(`${e.prenom} ${e.nom} supprimé(e)`, 'info')
  }

  function statutBadge(statut) {
    if (statut === 'accepte') return <span className="badge badge-accepte">{t.statuts.accepte}</span>
    if (statut === 'liste_attente') return <span className="badge badge-liste">{t.statuts.liste_attente}</span>
    return <span className="badge badge-attente">{t.statuts.en_attente}</span>
  }

  const compteurs = {}
  for (const r of config.reglesAge) compteurs[r.niveauId] = eleves.filter(e => e.niveauId === r.niveauId).length

  return (
    <div className="card">
      <div className="card-title">
        <span>👥</span> {ti.section_liste} ({eleves.length} {ti.n_eleves})
      </div>
      <div className="chips" style={{ marginBottom: 16 }}>
        {config.reglesAge.map(r => (
          <span key={r.niveauId} className={`chip niveau-tag ${getNiveauClass(r.niveauId)}`} style={{ direction: 'auto' }}>
            {r.label} : {compteurs[r.niveauId] || 0}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" placeholder={ti.rechercher} value={filtre} onChange={e => setFiltre(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="form-input" value={filtreNiveau} onChange={e => setFiltreNiveau(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">{ti.tous_niveaux}</option>
          {config.reglesAge.map(r => <option key={r.niveauId} value={r.niveauId}>{r.label}</option>)}
        </select>
        <button className="btn btn-success btn-sm" onClick={exporterExcel} disabled={eleves.length === 0}>
          📊 {langue === 'ar' ? 'تصدير Excel' : 'Export Excel'}
        </button>
      </div>
      {elevesFiltrés.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ink-muted)', fontSize: '1rem' }}>
          {eleves.length === 0 ? ti.aucune_inscr : ti.aucun_filtre}
        </div>
      ) : (
        <ScrollArrows vertical maxHeight={500} style={{ border: '1px solid var(--paper3)', borderRadius: 'var(--radius)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {[
                  { label: ti.col_num, key: 'num', defW: 40 },
                  ...config.champs.filter(c => c.type !== 'computed').map(c => ({ label: c.label, key: c.id, defW: 120, arabic: true })),
                  { label: ti.col_age, key: 'age', defW: 70 },
                  { label: ti.col_niveau, key: 'niveau', defW: 100 },
                  ...(allocation ? [
                    { label: 'Salle', key: 'salle', defW: 110 },
                    { label: ti.col_statut, key: 'statut', defW: 100 },
                  ] : []),
                  { label: '', key: 'actions', defW: 80 },
                ].map((col, idx) => (
                  <th key={col.key} style={{
                    position: 'relative',
                    width: colWidths[idx] || col.defW,
                    minWidth: colWidths[idx] || col.defW,
                    userSelect: 'none',
                    direction: col.arabic ? 'auto' : 'ltr',
                    padding: '10px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: col.label ? 'uppercase' : 'none',
                    color: 'var(--ink-muted)',
                    background: 'var(--paper)',
                    borderBottom: '2px solid var(--paper3)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}>
                    {col.label}
                    {col.key !== 'actions' && (
                      <div
                        onMouseDown={e => startResize(idx, e)}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0,
                          width: 6, cursor: 'col-resize',
                          background: 'transparent',
                          borderRight: '2px solid var(--paper3)',
                          zIndex: 1,
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderRightColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderRightColor = 'var(--paper3)'}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {elevesFiltrés.map((e, idx) => (
                <tr key={e.id}>
                  <td style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', padding: '8px', overflow: 'hidden', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                  {config.champs.filter(c => c.type !== 'computed').map(c => (
                    <td key={c.id} style={{ direction: 'auto', padding: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(e[c.id] || '')}>
                      {e[c.id] || '—'}
                    </td>
                  ))}
                  <td style={{ padding: '8px', overflow: 'hidden', whiteSpace: 'nowrap' }}><strong>{e.age}</strong> {ti.ans}</td>
                  <td style={{ padding: '8px', overflow: 'hidden' }}>
                    <span className={`niveau-tag ${getNiveauClass(e.niveauId)}`} style={{ direction: 'auto', fontSize: '0.75rem' }}>
                      {getNiveauLabel(e.niveauId, config.reglesAge)}
                    </span>
                  </td>
                  {allocation && (
                    <td style={{ padding: '8px', overflow: 'hidden', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {(() => {
                        if (e.statut !== 'accepte') return <span style={{ color: 'var(--ink-muted)' }}>—</span>
                        const res = allocation.affectations[e.niveauId]
                        if (!res?.classes) return <span style={{ color: 'var(--ink-muted)' }}>—</span>
                        const cls = res.classes.find(c => c.elevesIds && c.elevesIds.includes(e.id))
                        if (!cls) return <span style={{ color: 'var(--ink-muted)' }}>—</span>
                        return <span style={{ fontWeight: 600, color: 'var(--success)' }}>{cls.salle?.nomComplet || cls.salle?.nom || '—'}</span>
                      })()}
                    </td>
                  )}
                  {allocation && <td style={{ padding: '8px' }}>{statutBadge(e.statut)}</td>}
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!lectureSeule && <button className="btn btn-info btn-sm" onClick={() => onEditer(e)}><IconEdit /></button>}
                      {!lectureSeule && <button className="btn btn-danger btn-sm" onClick={() => confirmerSupprimer(e)}><IconTrash /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArrows>
      )}
    </div>
  )
}

function imprimerPDF(config, eleves, allocation, nomEtab, anneeLabel, langue) {
  function hasArabic(str) { return /[\u0600-\u06FF]/.test(str || '') }
  function arabStyle(str) { return hasArabic(String(str || '')) ? 'style="font-family:\'Noto Sans Arabic\',sans-serif;direction:rtl;text-align:right;"' : '' }
  const champsVisibles = config.champs.filter(c => c.type !== 'computed')
  const date = new Date().toLocaleDateString('fr-FR')
  const acceptes = eleves.filter(e => e.statut === 'accepte')
  const attente = eleves.filter(e => e.statut === 'liste_attente')
  const isRtl = langue === 'ar'
  const tableRows = (liste) => liste.map((e, idx) => `
    <tr>
      <td>${idx + 1}</td>
      ${champsVisibles.map(c => `<td ${arabStyle(e[c.id])}>${e[c.id] || '—'}</td>`).join('')}
      <td>${e.age ?? '—'}</td>
      <td ${arabStyle(config.reglesAge.find(r => r.niveauId === e.niveauId)?.label)}>${config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || '—'}</td>
      ${allocation ? `<td>${allocation.affectations[e.niveauId]?.salle?.nom || '—'}</td>` : ''}
    </tr>`).join('')
  const html = `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8">
    <title>${nomEtab} — ${anneeLabel}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
    <style>* { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${isRtl ? "'Noto Sans Arabic'," : ''}Arial, sans-serif; font-size: 10px; padding: 20px; direction: ${isRtl ? 'rtl' : 'ltr'}; }
    .header { display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #3b4a2f; margin-bottom: 16px; }
    .title { font-size: 16px; font-weight: bold; color: #3b4a2f; }
    .etab { font-size: 13px; font-weight: 700; color: #c8401a; font-family: 'Noto Sans Arabic', Arial; }
    .section { font-size: 13px; font-weight: bold; margin: 20px 0 8px; padding: 6px 10px; background: #3b4a2f; color: white; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #3b4a2f; color: white; padding: 6px 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 9px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f7f6f2; }
    @page { size: A4 landscape; margin: 1.5cm; }</style></head><body>
  <div class="header"><div><div class="title">${isRtl ? 'قائمة التسجيلات' : 'Liste des inscriptions'}</div>
    <div class="etab">${nomEtab || ''}</div>
    <div style="font-size:9px;color:#666;margin-top:4px;">${anneeLabel || ''} · ${date}</div></div>
    <div style="text-align:${isRtl ? 'left' : 'right'}">
      <div>${eleves.length} ${isRtl ? 'طلب' : 'demandes'} · ${acceptes.length} ${isRtl ? 'مقبول' : 'acceptés'} · ${attente.length} ${isRtl ? 'انتظار' : 'en attente'}</div>
    </div></div>
  ${acceptes.length > 0 ? `<div class="section">${isRtl ? 'المقبولون' : 'Acceptés'} (${acceptes.length})</div>
    <table><thead><tr><th>#</th>${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
    <th>${isRtl ? 'السن' : 'Âge'}</th><th>${isRtl ? 'المستوى' : 'Niveau'}</th>${allocation ? `<th>${isRtl ? 'الصّالة' : 'Salle'}</th>` : ''}</tr></thead>
    <tbody>${tableRows(acceptes)}</tbody></table>` : ''}
  ${attente.length > 0 ? `<div class="section">${isRtl ? 'قائمة الانتظار' : "Liste d'attente"} (${attente.length})</div>
    <table><thead><tr><th>#</th>${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
    <th>${isRtl ? 'السن' : 'Âge'}</th><th>${isRtl ? 'المستوى' : 'Niveau'}</th></tr></thead>
    <tbody>${tableRows(attente)}</tbody></table>` : ''}
  <script>window.onload = function() { window.print(); }</script></body></html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

function exporterExcelInscriptions(config, eleves, allocation, nomEtab, anneeLabel, langue) {
  const champsVisibles = config.champs.filter(c => c.type !== 'computed')
  const headers = ['#', ...champsVisibles.map(c => c.label), 'Âge', 'Niveau', 'Statut']
  if (allocation) headers.push('Salle')
  const rows = eleves.map((e, idx) => {
    const niv = config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || ''
    const statut = e.statut === 'accepte' ? (langue === 'ar' ? 'مقبول' : 'Accepté') : e.statut === 'liste_attente' ? (langue === 'ar' ? 'قائمة انتظار' : "Liste d'attente") : ''
    const row = [idx + 1, ...champsVisibles.map(c => e[c.id] || ''), e.age || '', niv, statut]
    if (allocation) {
      const res = allocation.affectations[e.niveauId]
      const cls = res?.classes?.find(c => c.elevesIds?.includes(e.id))
      row.push(cls?.salle?.nomComplet || cls?.salle?.nom || res?.salle?.nom || '—')
    }
    return row
  })
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  ws['!cols'] = headers.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inscrits')
  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  XLSX.writeFile(wb, `inscrits_${date}.xlsx`)
}

export default function PageInscriptions({ lectureSeule, nomEtab, anneeLabel }) {
  const { t, langue } = useI18n()
  const { effacerToutesInscriptions, creerSauvegarde, eleves: elevesAll, config: configAll, allocation: allocationAll } = useApp()
  const toast2 = useToast()
  const [eleveAEditer, setEleveAEditer] = useState(null)

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        <div>
          <h2 className="page-title">{t.inscriptions.titre}</h2>
          <p className="page-subtitle">{t.inscriptions.sous_titre}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={async () => { await creerSauvegarde('manuel'); toast2(langue === 'ar' ? 'تم الحفظ' : 'Sauvegarde créée', 'success') }}>
            💾 {langue === 'ar' ? 'حفظ الآن' : 'Sauvegarder'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            if (!window.confirm(langue === 'ar' ? 'حذف جميع التسجيلات ؟\n\nسيتم إنشاء نسخة احتياطية تلقائياً.' : 'Effacer toutes les inscriptions ?\n\nUne sauvegarde sera créée automatiquement.')) return
            await effacerToutesInscriptions()
            toast2(langue === 'ar' ? 'تم الحذف' : 'Inscriptions effacées', 'info')
            setEleveAEditer(null)
          }}>
            🗑 {langue === 'ar' ? 'حذف الكل' : 'Effacer tout'}
          </button>
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
            🖨 {langue === 'ar' ? 'طباعة' : 'Imprimer'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            if (elevesAll.length === 0) { toast2(langue === 'ar' ? 'لا توجد بيانات' : 'Aucune donnée à exporter', 'error'); return }
            exporterExcelInscriptions(configAll, elevesAll, allocationAll, nomEtab, anneeLabel, langue)
            toast2(langue === 'ar' ? '✓ تم تصدير Excel' : '✓ Export Excel généré', 'success')
          }}>
            📊 {langue === 'ar' ? 'تصدير Excel' : 'Export Excel'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            if (elevesAll.length === 0) { toast2(langue === 'ar' ? 'لا توجد بيانات' : 'Aucune donnée à exporter', 'error'); return }
            imprimerPDF(configAll, elevesAll, allocationAll, nomEtab, anneeLabel, langue)
          }}>
            📄 {langue === 'ar' ? 'طباعة PDF' : 'Export PDF'}
          </button>
        </div>
      </div>
      {!lectureSeule && <FormulaireIndividuel eleveAEditer={eleveAEditer} onAnnulerEdition={() => setEleveAEditer(null)} />}
      {!lectureSeule && !eleveAEditer && <ImportExcel />}
      <ListeInscriptions onEditer={e => { setEleveAEditer(e); window.scrollTo({ top: 0, behavior: 'smooth' }) }} lectureSeule={lectureSeule} />
    </div>
  )
}
