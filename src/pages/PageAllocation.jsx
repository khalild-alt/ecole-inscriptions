// src/pages/PageAllocation.jsx
import { useState, useEffect } from 'react'
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const RANG_COLORS = [
  { bg: '#1a5fa0', light: '#dbeafe', text: '#1e3a5f', badge: '#3b82f6', xl: 'FF1a5fa0' },
  { bg: '#2d7a4f', light: '#dcfce7', text: '#14532d', badge: '#22c55e', xl: 'FF2d7a4f' },
  { bg: '#b07d1a', light: '#fef9c3', text: '#713f12', badge: '#eab308', xl: 'FFb07d1a' },
  { bg: '#6b21a8', light: '#f3e8ff', text: '#3b0764', badge: '#a855f7', xl: 'FF6b21a8' },
  { bg: '#be123c', light: '#ffe4e6', text: '#881337', badge: '#f43f5e', xl: 'FFbe123c' },
  { bg: '#0f766e', light: '#ccfbf1', text: '#134e4a', badge: '#14b8a6', xl: 'FF0f766e' },
]
const DEFAULT_COLOR = { bg: '#374151', light: '#f3f4f6', text: '#111827', badge: '#6b7280', xl: 'FF374151' }
const _cache = {}

function getNiveauColor(niveauId, reglesAge) {
  if (_cache[niveauId]) return _cache[niveauId]
  if (reglesAge) {
    const idx = reglesAge.findIndex(r => r.niveauId === niveauId)
    if (idx >= 0) { _cache[niveauId] = RANG_COLORS[idx % RANG_COLORS.length]; return _cache[niveauId] }
  }
  return DEFAULT_COLOR
}

function nomSalleComplet(salle) {
  if (!salle) return '—'
  return salle.nomComplet ? `${salle.nom} — ${salle.nomComplet}` : salle.nom
}

function exporterAllocationExcel(allocation, eleves, config, terminologie) {
  const wb = XLSX.utils.book_new()
  const terme = terminologie?.groupe || 'Groupe'
  const champs = config.champs.filter(c => c.type !== 'computed')
  const champsHeaders = champs.map(c => c.label)

  function getCouleurXL(niveauId) {
    const c = getNiveauColor(niveauId, config.reglesAge)
    return c.xl || 'FF374151'
  }

  for (const r of config.reglesAge) {
    const resRaw = allocation.affectations[r.niveauId]
    if (!resRaw) continue
    const res = resRaw.classes ? resRaw : { ...resRaw, classes: resRaw.salle ? [{ classeId: r.niveauId+'_c1', classeNum: 1, salle: resRaw.salle, elevesIds: eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte').map(e => e.id) }] : [] }
    const couleurXL = getCouleurXL(r.niveauId)
    const rows = []
    for (const cls of res.classes) {
      const elevesGroupe = eleves.filter(e => cls.elevesIds?.includes(e.id))
      const titre = [`${r.label} — ${terme} ${cls.classeNum} — ${cls.salle?.nom || ''}${cls.salle?.nomComplet ? ' — ' + cls.salle.nomComplet : ''} (${elevesGroupe.length}/${cls.salle?.capacite || '?'})`]
      rows.push(titre)
      rows.push(['#', ...champsHeaders, 'Âge'])
      elevesGroupe.forEach((e, idx) => rows.push([idx + 1, ...champs.map(c => e[c.id] || ''), e.age || '']))
      rows.push([])
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 5 }, ...champsHeaders.map(() => ({ wch: 18 })), { wch: 8 }]
    let rowIdx = 0
    for (const cls of res.classes) {
      const elevesGroupe = eleves.filter(e => cls.elevesIds?.includes(e.id))
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 0 })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].s = { fill: { fgColor: { rgb: couleurXL }, patternType: 'solid' }, font: { color: { rgb: 'FFFFFFFF' }, bold: true, sz: 11 } }
      ws['!merges'] = ws['!merges'] || []
      ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: champsHeaders.length + 1 } })
      rowIdx += 2 + elevesGroupe.length + 1
    }
    const sheetName = r.label.replace(/[\\/*\[\]?:]/g, '').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName || ('Niveau' + r.niveauId))
  }

  const synthRows = [['Niveau', terme, 'Salle', 'Nom complet', 'Capacité', 'Élèves', 'Places libres', 'Remplissage']]
  for (const r of config.reglesAge) {
    const resRaw = allocation.affectations[r.niveauId]
    if (!resRaw) continue
    const res = resRaw.classes ? resRaw : { ...resRaw, classes: resRaw.salle ? [{ classeId: r.niveauId+'_c1', classeNum: 1, salle: resRaw.salle, elevesIds: eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte').map(e => e.id) }] : [] }
    for (const cls of res.classes) {
      const nbEleves = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
      const cap = cls.salle?.capacite || 0
      synthRows.push([r.label, `${terme} ${cls.classeNum}`, cls.salle?.nom || '—', cls.salle?.nomComplet || '—', cap, nbEleves, Math.max(0, cap - nbEleves), cap > 0 ? ((nbEleves / cap) * 100).toFixed(0) + '%' : '—'])
    }
  }
  const wsSynth = XLSX.utils.aoa_to_sheet(synthRows)
  wsSynth['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsSynth, 'Synthese')

  const nonAlloues = eleves.filter(e => e.statut === 'liste_attente')
  if (nonAlloues.length > 0) {
    const naRows = [['#', ...champsHeaders, 'Âge', 'Niveau']]
    nonAlloues.forEach((e, idx) => {
      const niv = config.reglesAge.find(r => r.niveauId === e.niveauId)
      naRows.push([idx + 1, ...champs.map(c => e[c.id] || ''), e.age || '', niv?.label || '—'])
    })
    const wsNA = XLSX.utils.aoa_to_sheet(naRows)
    wsNA['!cols'] = [{ wch: 5 }, ...champsHeaders.map(() => ({ wch: 18 })), { wch: 8 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsNA, 'Non alloues')
  }

  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  XLSX.writeFile(wb, `allocation_${date}.xlsx`)
}

function ModalAjouterAGroupe({ eleve, allocation, config, eleves, onConfirm, onClose, terminologie, langue }) {
  const [niveauCible, setNiveauCible] = useState('')
  const [classeCible, setClasseCible] = useState('')
  const niveauxCompatibles = config.reglesAge.filter(r => eleve.age >= r.ageMin && eleve.age <= r.ageMax)
  const classesDisponibles = niveauCible && allocation?.affectations?.[niveauCible]?.classes ? allocation.affectations[niveauCible].classes : []
  const terme = terminologie?.groupe || 'Groupe'
  const ar = langue === 'ar'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
          {ar ? 'إضافة :' : 'Ajouter :'} {eleve.prenom} {eleve.nom}
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>
          {ar ? 'السن :' : 'Âge :'} <strong>{eleve.age} {ar ? 'سنوات' : 'ans'}</strong> — {ar ? 'المستويات المتوافقة :' : 'niveaux compatibles :'} {niveauxCompatibles.map(r => r.label).join(', ')}
        </div>
        <div className="form-group">
          <label className="form-label">{ar ? 'المستوى المستهدف' : 'Niveau de destination'}</label>
          <select className="form-input" value={niveauCible} onChange={e => { setNiveauCible(e.target.value); setClasseCible('') }}>
            <option value="">{ar ? '— اختر —' : '— Choisir —'}</option>
            {niveauxCompatibles.map(r => <option key={r.niveauId} value={r.niveauId}>{r.label}</option>)}
          </select>
        </div>
        {niveauCible && (
          <div className="form-group">
            <label className="form-label">{terme} {ar ? 'المستهدف' : 'de destination'}</label>
            {classesDisponibles.length === 0 ? (
              <div className="alert alert-warning">{ar ? 'لا توجد أقسام في هذا المستوى.' : 'Aucun groupe dans ce niveau.'}</div>
            ) : (
              <select className="form-input" value={classeCible} onChange={e => setClasseCible(e.target.value)}>
                <option value="">{ar ? '— اختر —' : '— Choisir —'}</option>
                {classesDisponibles.map(c => {
                  const nb = eleves.filter(e => c.elevesIds?.includes(e.id)).length
                  return <option key={c.classeId} value={c.classeId}>{terme} {c.classeNum} — {nomSalleComplet(c.salle)} ({nb}/{c.salle.capacite}){nb >= c.salle.capacite ? (ar ? ' ⚠ ممتلئ' : ' ⚠ PLEIN') : ''}</option>
                })}
              </select>
            )}
          </div>
        )}
        {classeCible && (() => {
          const cls = classesDisponibles.find(c => c.classeId === classeCible)
          const nb = cls ? eleves.filter(e => cls.elevesIds?.includes(e.id)).length : 0
          if (cls && nb >= cls.salle.capacite) return <div className="alert alert-warning">⚠ {ar ? `هذا القسم ممتلئ (${nb}/${cls.salle.capacite}). سيُضاف التلميذ بتجاوز الطاقة.` : `Ce groupe est plein (${nb}/${cls.salle.capacite}). L'élève sera ajouté en dépassement.`}</div>
          return null
        })()}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!classeCible} onClick={() => onConfirm(niveauCible, classeCible)}>
            {ar ? '✓ إضافة إلى القسم' : '✓ Ajouter dans ce groupe'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>{ar ? 'إلغاء' : 'Annuler'}</button>
        </div>
      </div>
    </div>
  )
}

function CarteGroupe({ classe, niveauId, niveauLabel, eleves, config, terminologie, fige, onFiger, onOuvrirModal, onRetirer, lectureSeule, langue, modeReaffectation, toutesLesSalles, onChangerSalle, sallesDejaChoisies }) {
  const couleur = getNiveauColor(niveauId, config.reglesAge)
  const elevesGroupe = eleves.filter(e => classe.elevesIds && classe.elevesIds.includes(e.id))
  const terme = terminologie?.groupe || 'Groupe'
  const ar = langue === 'ar'
  const nbEleves = elevesGroupe.length
  const cap = classe.salle?.capacite || 1
  const taux = ((nbEleves / cap) * 100).toFixed(0)
  const nomSalleFull = classe.salle ? (classe.salle.nomComplet ? `${classe.salle.nom} — ${classe.salle.nomComplet}` : classe.salle.nom) : '—'

  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden', border: fige ? `2px solid ${couleur.bg}` : `1.5px solid ${couleur.badge}33` }}>
      <div style={{ background: fige ? couleur.bg : couleur.bg + 'dd', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {fige && <span>🔒</span>}
            <span style={{ direction: 'auto' }}>{niveauLabel}</span>
            <span style={{ opacity: 0.6 }}>—</span>
            <span>
              <span style={{ fontFamily: "'Noto Sans Arabic', sans-serif", direction: 'rtl' }}>فوج {classe.classeNum}</span>
              <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
              <span>{terme} {classe.classeNum}</span>
            </span>
            <span style={{ opacity: 0.6 }}>—</span>
            <span style={{ direction: 'auto' }}>{nomSalleFull}</span>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
            {nbEleves}/{cap} {ar ? 'تلاميذ' : 'élèves'} · {taux}%
            {cap - nbEleves > 0 && ` · ${cap - nbEleves} ${ar ? 'مقعد شاغر' : 'place(s) libre(s)'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {modeReaffectation && toutesLesSalles && !fige && (
            <select value={sallesDejaChoisies?.[classe.classeId] || classe.salle?.id || ''}
              onChange={e => onChangerSalle(classe.classeId, e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '2px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '0.82rem', cursor: 'pointer' }}>
              {toutesLesSalles.filter(s => s.capacite >= nbEleves).map(s => (
                <option key={s.id} value={s.id} style={{ color: '#000', background: 'white' }}>
                  {s.nom}{s.nomComplet ? ` — ${s.nomComplet}` : ''} ({s.capacite})
                </option>
              ))}
            </select>
          )}
          {!lectureSeule && !modeReaffectation && (
            <button className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', fontSize: '0.78rem' }}
              onClick={() => onFiger(classe.classeId, !fige)}>
              {fige ? (ar ? '🔓 تحرير' : '🔓 Libérer') : (ar ? '🔒 تجميد' : '🔒 Figer')}
            </button>
          )}
          <div style={{ textAlign: 'right', minWidth: 48 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{taux}%</div>
          </div>
        </div>
      </div>

      <div style={{ height: 6, background: couleur.light }}>
        <div style={{ height: '100%', width: `${Math.min(100, nbEleves / cap * 100)}%`, background: couleur.bg, transition: 'width 0.3s' }} />
      </div>

      <div style={{ padding: '10px 16px' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 6 }}>
            👥 {nbEleves} {ar ? 'تلميذ' : 'élève'}{nbEleves > 1 && !ar ? 's' : ''} ▾
          </summary>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: couleur.light }}>
                <tr>
                  <th style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                  {config.champs.filter(c => c.type !== 'computed').map(c => (
                    <th key={c.id} style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', direction: 'auto', textAlign: 'left' }}>{c.label}</th>
                  ))}
                  <th style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', textAlign: 'left' }}>{ar ? 'السن' : 'Âge'}</th>
                  {!lectureSeule && <th style={{ width: 80 }}></th>}
                </tr>
              </thead>
              <tbody>
                {elevesGroupe.map((e, idx) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${couleur.light}` }}>
                    <td style={{ padding: '5px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <td key={c.id} style={{ padding: '5px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                    ))}
                    <td style={{ padding: '5px 8px' }}><strong>{e.age}</strong> {ar ? 'سنوات' : 'ans'}</td>
                    {!lectureSeule && (
                      <td style={{ padding: '5px 8px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onOuvrirModal(e, niveauId, classe.classeId)} title={ar ? 'نقل' : 'Déplacer'}>↔</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onRetirer(e.id, classe.classeId, niveauId)}
                            title={ar ? 'إزالة من القسم' : 'Retirer de ce groupe'}>✕</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  )
}

function CarteNiveau({ niveauId, label, res, eleves, config, terminologie, groupesFiges, onFiger, onOuvrirModal, onRetirer, lectureSeule, langue, modeReaffectation, toutesLesSalles, onChangerSalle, sallesDejaChoisies }) {
  const couleur = getNiveauColor(niveauId, config.reglesAge)
  const ar = langue === 'ar'
  const terme = terminologie?.groupe || 'Groupe'
  const enAttente = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')
  const elevesNiveau = eleves.filter(e => e.niveauId === niveauId)

  return (
    <div style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: `2px solid ${couleur.badge}44`, boxShadow: 'var(--shadow)' }}>
      <div style={{ background: couleur.light, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${couleur.badge}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: couleur.bg, color: 'white', borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: '0.95rem', direction: 'auto' }}>{label}</span>
          <span style={{ fontSize: '0.85rem', color: couleur.text }}>{res.classes.length} {ar ? (res.classes.length > 1 ? 'أقسام' : 'قسم') : `${terme}${res.classes.length > 1 ? 's' : ''}`}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span style={{ color: couleur.text }}>{elevesNiveau.length} {ar ? 'طلب' : 'demandes'}</span>
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ {res.nbAcceptes} {ar ? 'مقبول' : 'acceptés'}</span>
          {enAttente.length > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⏳ {enAttente.length} {ar ? 'في الانتظار' : 'en attente'}</span>}
        </div>
      </div>

      <div style={{ padding: '12px', background: 'white' }}>
        {res.classes.map(cls => (
          <CarteGroupe key={cls.classeId} classe={cls} niveauId={niveauId} niveauLabel={label}
            eleves={eleves} config={config} terminologie={terminologie}
            fige={groupesFiges.has(cls.classeId)} onFiger={onFiger}
            onOuvrirModal={onOuvrirModal} onRetirer={onRetirer}
            lectureSeule={lectureSeule} langue={langue}
            modeReaffectation={modeReaffectation} toutesLesSalles={toutesLesSalles}
            onChangerSalle={onChangerSalle} sallesDejaChoisies={sallesDejaChoisies} />
        ))}

        {enAttente.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
              ⏳ {ar ? `قائمة الانتظار : ${enAttente.length} تلميذ` : `Liste d'attente : ${enAttente.length} élève${enAttente.length > 1 ? 's' : ''}`} ▾
            </summary>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', direction: 'auto', textAlign: 'left' }}>{c.label}</th>
                    ))}
                    <th style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', textAlign: 'left' }}>{ar ? 'السن' : 'Âge'}</th>
                    {!lectureSeule && <th style={{ width: 80 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {enAttente.map((e, idx) => (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                      <td style={{ padding: '4px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                      {config.champs.filter(c => c.type !== 'computed').map(c => (
                        <td key={c.id} style={{ padding: '4px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                      ))}
                      <td style={{ padding: '4px 8px' }}>{e.age} {ar ? 'سنوات' : 'ans'}</td>
                      {!lectureSeule && (
                        <td style={{ padding: '4px 8px' }}>
                          <button className="btn btn-success btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onOuvrirModal(e, niveauId, null)}>
                            {ar ? '+ إضافة' : '+ Ajouter'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

export default function PageAllocation({ lectureSeule, nomEtab, anneeLabel }) {
  const { config, eleves, setEleves, allocation, setAllocation, lancerOptimisation, annee,
    chargerSauvegardesAllocations, sauvegarderAllocationNommee, renommerSauvegardeAllocation,
    supprimerSauvegardeAllocation, chargerSauvegardeAllocation } = useApp()
  const { langue } = useI18n()
  const toast = useToast()
  const terminologie = config.terminologie || DEFAULT_CONFIG.terminologie || { groupe: 'Groupe', annee: 'Année' }
  const ar = langue === 'ar'

  const [groupesFiges, setGroupesFiges] = useState(() =>
    allocation?.groupesFiges ? new Set(allocation.groupesFiges) : new Set()
  )
  const [calcul, setCalcul] = useState(false)
  const [modalEleve, setModalEleve] = useState(null)
  const [elevesHorsGroupe, setElevesHorsGroupe] = useState([])
  const [modeReaffectation, setModeReaffectation] = useState(false)
  const [reaffectations, setReaffectations] = useState({})
  const [solutionsAuto, setSolutionsAuto] = useState([])
  const [indexSolution, setIndexSolution] = useState(-1)

  // ── Sauvegardes nommées d'allocations ──
  const [sauvegardesAllocations, setSauvegardesAllocations] = useState([])
  const [sauvegardeSelectionnee, setSauvegardeSelectionnee] = useState('')
  const [savingSnapshot, setSavingSnapshot] = useState(false)

  async function rafraichirSauvegardes() {
    const data = await chargerSauvegardesAllocations()
    setSauvegardesAllocations(data)
  }

  useEffect(() => { if (annee) rafraichirSauvegardes() }, [annee])

  async function handleSauvegarderNommee() {
    if (!allocation) return
    const nom = window.prompt(ar ? 'اسم هذا التوزيع :' : 'Nom de cette configuration :', `${ar ? 'توزيع' : 'Configuration'} ${new Date().toLocaleDateString('fr-FR')}`)
    if (!nom || !nom.trim()) return
    setSavingSnapshot(true)
    const res = await sauvegarderAllocationNommee(nom.trim())
    setSavingSnapshot(false)
    if (res.error) { toast('Erreur : ' + res.error, 'error'); return }
    toast(ar ? `✓ تم حفظ "${nom.trim()}"` : `✓ "${nom.trim()}" sauvegardé`, 'success')
    await rafraichirSauvegardes()
  }

  async function handleChargerSauvegarde(id) {
    if (!id) return
    const res = await chargerSauvegardeAllocation(id)
    if (res.error) { toast('Erreur : ' + res.error, 'error'); return }
    const { affectations, groupes_figes, mode } = res.data
    await sauvegarderAllocation(affectations, new Set(groupes_figes || []))
    setGroupesFiges(new Set(groupes_figes || []))
    setSolutionsAuto([])
    setIndexSolution(-1)
    toast(ar ? '✓ تم استرجاع التوزيع' : '✓ Configuration restaurée', 'success')
  }

  async function handleRenommerSauvegarde(id, ancienNom) {
    const nouveauNom = window.prompt(ar ? 'الاسم الجديد :' : 'Nouveau nom :', ancienNom)
    if (!nouveauNom || !nouveauNom.trim() || nouveauNom.trim() === ancienNom) return
    const res = await renommerSauvegardeAllocation(id, nouveauNom.trim())
    if (res.error) { toast('Erreur : ' + res.error, 'error'); return }
    toast(ar ? '✓ تم تغيير الاسم' : '✓ Nom modifié', 'success')
    await rafraichirSauvegardes()
  }

  async function handleSupprimerSauvegarde(id, nom) {
    if (!window.confirm(ar ? `حذف "${nom}" ؟` : `Supprimer "${nom}" ?`)) return
    const res = await supprimerSauvegardeAllocation(id)
    if (res.error) { toast('Erreur : ' + res.error, 'error'); return }
    if (sauvegardeSelectionnee === id) setSauvegardeSelectionnee('')
    toast(ar ? '✓ تم الحذف' : '✓ Supprimé', 'success')
    await rafraichirSauvegardes()
  }

  async function handleOptimiser() {
    if (eleves.length === 0) { toast(ar ? 'لا توجد تسجيلات' : 'Aucune inscription à traiter', 'error'); return }
    setCalcul(true)
    setElevesHorsGroupe([])
    setSolutionsAuto([])
    setIndexSolution(-1)
    try {
      await lancerOptimisation()
      toast(ar ? 'تم حساب التوزيع' : 'Allocation calculée', 'success')
    } catch(e) { toast('Erreur : ' + e.message, 'error') }
    setCalcul(false)
  }

  async function sauvegarderAllocation(nouvellesAffectations, nouveauxFiges) {
    if (!annee?.id) return
    const aff = nouvellesAffectations || allocation.affectations
    const figes = Array.from(nouveauxFiges || groupesFiges)
    await supabase.from('allocations').delete().eq('annee_id', annee.id)
    await supabase.from('allocations').insert({ annee_id: annee.id, affectations: aff, groupes_figes: figes, mode: 'multi', calculated_at: new Date().toISOString() })
    setAllocation({ affectations: aff, mode: 'multi', date: new Date().toISOString(), groupesFiges: figes })
  }


  async function appliquerSolution(idx, solutionsOverride) {
    const sols = solutionsOverride || solutionsAuto
    if (!sols.length) return
    const sol = sols[idx]
    const map = {}
    sol.aff.forEach(a => { map[a.classeId] = a.sid })
    const aff2 = JSON.parse(JSON.stringify(allocation.affectations))
    for (const res of Object.values(aff2)) {
      for (const cls of res.classes || []) {
        const s = config.salles.find(sl => sl.id === map[cls.classeId])
        if (s) { cls.salle = s; cls.placesLibres = s.capacite - (cls.elevesIds?.length || 0); cls.tauxRemplissage = (((cls.elevesIds?.length || 0) / s.capacite) * 100).toFixed(1) }
      }
    }
    await sauvegarderAllocation(aff2, null)
    setIndexSolution(idx)
    toast(ar ? `⚡ حل ${idx+1}/${sols.length} — ${sol.vides} مقعد شاغر` : `⚡ Solution ${idx+1}/${sols.length} — ${sol.vides} place(s) vide(s)`, 'success')
  }

  async function reaffectationAutomatique() {
    if (!allocation) return

    // Séparer groupes figés (salle fixe) et groupes libres
    const groupesFigesArr = []
    const groupes = []
    for (const res of Object.values(allocation.affectations)) {
      for (const cls of res.classes || []) {
        const nb = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
        if (groupesFiges.has(cls.classeId)) {
          // Groupe figé : sa salle est réservée, on ne la touche pas
          groupesFigesArr.push({ classeId: cls.classeId, sid: cls.salle?.id, nb })
        } else {
          groupes.push({ classeId: cls.classeId, nb })
        }
      }
    }

    // Salles déjà réservées par les groupes figés
    const sallesReservees = new Set(groupesFigesArr.map(g => g.sid).filter(Boolean))

    // Pool de salles disponibles pour le backtracking (hors salles figées)
    const salles = [...config.salles]
      .filter(s => !sallesReservees.has(s.id))
      .sort((a, b) => a.capacite - b.capacite)

    const solutions = []
    function bt(idx, used, aff) {
      if (solutions.length >= 200) return
      if (idx === groupes.length) {
        // Ajouter les affectations figées à chaque solution
        const affComplete = [...aff, ...groupesFigesArr]
        const vides = affComplete.reduce((s, a) => s + (config.salles.find(sl => sl.id === a.sid)?.capacite || 0) - a.nb, 0)
        solutions.push({ aff: affComplete, vides }); return
      }
      for (let i = 0; i < salles.length; i++) {
        if (!used[i] && salles[i].capacite >= groupes[idx].nb) {
          used[i] = true
          aff.push({ classeId: groupes[idx].classeId, sid: salles[i].id, nb: groupes[idx].nb })
          bt(idx + 1, used, aff); aff.pop(); used[i] = false
        }
      }
    }
    bt(0, new Array(salles.length).fill(false), [])
    solutions.sort((a, b) => a.vides - b.vides)
    if (!solutions.length) { toast(ar ? 'لا توجد حلول ممكنة' : 'Aucune solution possible', 'error'); return }
    const newIdx = indexSolution < 0 ? 0 : (indexSolution + 1) % solutions.length
    setSolutionsAuto(solutions)
    setIndexSolution(newIdx)
    await appliquerSolution(newIdx, solutions)
  }

  function demarrerReaffectation() {
    const init = {}
    if (allocation) {
      for (const res of Object.values(allocation.affectations)) {
        for (const cls of res.classes || []) { if (cls.salle) init[cls.classeId] = cls.salle.id }
      }
    }
    setReaffectations(init); setModeReaffectation(true)
  }

  async function validerReaffectation() {
    const vals = Object.values(reaffectations)
    const doublons = vals.filter((s, i) => vals.indexOf(s) !== i)
    if (doublons.length > 0) {
      const nom = config.salles.find(s => s.id === doublons[0])?.nom || doublons[0]
      toast(ar ? `الصّالة ${nom} مستخدمة مرتين` : `Salle ${nom} affectée deux fois`, 'error'); return
    }
    for (const [cid, sid] of Object.entries(reaffectations)) {
      const salle = config.salles.find(s => s.id === sid)
      if (!salle) continue
      for (const res of Object.values(allocation.affectations)) {
        const cls = (res.classes || []).find(c => c.classeId === cid)
        if (cls) {
          const nb = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
          if (salle.capacite < nb) { toast(ar ? `طاقة ${salle.nom} (${salle.capacite}) أقل من التلاميذ (${nb})` : `Capacité de ${salle.nom} (${salle.capacite}) insuffisante pour ${nb} élèves`, 'error'); return }
        }
      }
    }
    const aff = JSON.parse(JSON.stringify(allocation.affectations))
    for (const res of Object.values(aff)) {
      for (const cls of res.classes || []) {
        const s = config.salles.find(sl => sl.id === reaffectations[cls.classeId])
        if (s) { cls.salle = s; cls.placesLibres = s.capacite - (cls.elevesIds?.length || 0); cls.tauxRemplissage = (((cls.elevesIds?.length || 0) / s.capacite) * 100).toFixed(1) }
      }
    }
    await sauvegarderAllocation(aff, null)
    setModeReaffectation(false); setReaffectations({})
    toast(ar ? '✓ تم التغيير اليدوي' : '✓ Réaffectation manuelle validée', 'success')
  }

  async function handleFiger(classeId, figer) {
    const n = new Set(groupesFiges)
    if (figer) n.add(classeId); else n.delete(classeId)
    setGroupesFiges(n)
    await sauvegarderAllocation(null, n)
    toast(figer ? (ar ? '🔒 تم تجميد القسم' : '🔒 Groupe figé') : (ar ? '🔓 تم تحرير القسم' : '🔓 Groupe libéré'), 'info')
  }

  async function handleRetirer(eleveId, classeId, niveauId) {
    const aff = JSON.parse(JSON.stringify(allocation.affectations))
    for (const res of Object.values(aff)) {
      for (const cls of res.classes || []) {
        if (cls.elevesIds) cls.elevesIds = cls.elevesIds.filter(id => id !== eleveId)
      }
    }
    for (const [nId, res] of Object.entries(aff)) {
      if (res.classes) res.nbAcceptes = res.classes.reduce((s, c) => s + (c.elevesIds?.length || 0), 0)
    }
    await supabase.from('eleves').update({ statut: 'liste_attente' }).eq('id', eleveId)
    setEleves(prev => prev.map(e => e.id === eleveId ? { ...e, statut: 'liste_attente' } : e))
    const eleve = eleves.find(e => e.id === eleveId)
    if (eleve) setElevesHorsGroupe(prev => [...prev, eleve])
    await sauvegarderAllocation(aff, null)
    toast(ar ? 'تمت إزالة التلميذ من القسم' : 'Élève retiré du groupe', 'info')
  }

  async function confirmerAjout(niveauCible, classeIdCible) {
    if (!modalEleve || !allocation) return
    const { eleve } = modalEleve
    const aff = JSON.parse(JSON.stringify(allocation.affectations))
    for (const res of Object.values(aff)) {
      for (const cls of res.classes || []) {
        if (cls.elevesIds) cls.elevesIds = cls.elevesIds.filter(id => id !== eleve.id)
      }
    }
    const clsCible = aff[niveauCible]?.classes?.find(c => c.classeId === classeIdCible)
    if (clsCible) { if (!clsCible.elevesIds) clsCible.elevesIds = []; clsCible.elevesIds.push(eleve.id) }
    for (const res of Object.values(aff)) {
      if (res.classes) res.nbAcceptes = res.classes.reduce((s, c) => s + (c.elevesIds?.length || 0), 0)
    }
    await supabase.from('eleves').update({ statut: 'accepte', niveau_id: niveauCible }).eq('id', eleve.id)
    setEleves(prev => prev.map(e => e.id === eleve.id ? { ...e, statut: 'accepte', niveauId: niveauCible } : e))
    setElevesHorsGroupe(prev => prev.filter(e => e.id !== eleve.id))
    await sauvegarderAllocation(aff, null)
    setModalEleve(null)
    toast(ar ? `تمت إضافة ${eleve.prenom} ${eleve.nom} إلى القسم` : `${eleve.prenom} ${eleve.nom} ajouté au groupe`, 'success')
  }

  async function transfererEleve(classeSourceId, classeDestId, niveauId) {
    // Prend un élève de classeSource et le met dans classeDest
    const aff = JSON.parse(JSON.stringify(allocation.affectations))
    const res = aff[niveauId]
    if (!res?.classes) return
    const src = res.classes.find(c => c.classeId === classeSourceId)
    const dst = res.classes.find(c => c.classeId === classeDestId)
    if (!src?.elevesIds?.length || !dst) return
    // Prend le dernier élève de la source
    const eleveId = src.elevesIds[src.elevesIds.length - 1]
    src.elevesIds = src.elevesIds.filter(id => id !== eleveId)
    if (!dst.elevesIds) dst.elevesIds = []
    dst.elevesIds.push(eleveId)
    // Recalcul nbAcceptes
    res.nbAcceptes = res.classes.reduce((s, c) => s + (c.elevesIds?.length || 0), 0)
    await sauvegarderAllocation(aff, null)
    toast(ar ? '✓ تم نقل التلميذ' : '✓ Élève transféré', 'success')
  }

  const totalEleves = eleves.length
  const totalAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const totalAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const totalCapacite = allocation ? Object.values(allocation.affectations).reduce((s, r) => {
    if (r.classes) return s + r.classes.reduce((sc, c) => sc + (c.salle?.capacite || 0), 0)
    return s + (r.salle?.capacite || 0)
  }, 0) : 0
  const tauxGlobal = totalCapacite > 0 ? ((totalAcceptes / totalCapacite) * 100).toFixed(1) : 0

  function normaliserRes(r, niveauId) {
    if (r.classes) return r
    const acc = eleves.filter(e => e.niveauId === niveauId && e.statut === 'accepte')
    const att = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')
    return { ...r, classes: r.salle ? [{ classeId: niveauId+'_c1', classeNum: 1, salle: r.salle, nbAcceptes: acc.length, placesLibres: Math.max(0, r.salle.capacite - acc.length), tauxRemplissage: r.salle.capacite > 0 ? ((acc.length / r.salle.capacite)*100).toFixed(1) : '0', elevesIds: acc.map(e => e.id) }] : [], nbDemandes: acc.length + att.length, nbAcceptes: acc.length, nbAttente: att.length }
  }

  return (
    <div className="page">
      <h2 className="page-title">{ar ? 'توزيع الأقسام' : 'Allocation des salles'}</h2>

      {!lectureSeule && (
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0 || calcul} style={{ opacity: calcul ? 0.7 : 1 }}>
              {calcul ? (ar ? '⏳ جاري الحساب…' : '⏳ Calcul en cours…') : (ar ? '▶ إيجاد توزيع ممكن' : "▶ Trouver une configuration d'affectations")}
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
              🖨 {ar ? 'طباعة' : 'Imprimer'}
            </button>
            {groupesFiges.size > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>🔒 {groupesFiges.size} {ar ? 'قسم مثبت' : 'groupe(s) figé(s)'}</span>}
            {allocation && !modeReaffectation && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ fontWeight: 700, opacity: solutionsAuto.length > 1 ? 1 : 0.5, cursor: solutionsAuto.length > 1 ? 'pointer' : 'not-allowed' }}
                  disabled={solutionsAuto.length <= 1}
                  onClick={() => appliquerSolution((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length)}>
                  ⏮ {solutionsAuto.length > 0 ? (ar ? `التوزيع السابق (${((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length) + 1}/${solutionsAuto.length})` : `Configuration précédente (${((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length) + 1}/${solutionsAuto.length})`) : (ar ? 'التوزيع السابق' : 'Configuration précédente')}
                </button>
                <button className="btn btn-primary" style={{ fontWeight: 700 }} onClick={reaffectationAutomatique}>
                  ⏭ {solutionsAuto.length > 0 ? (ar ? `التوزيع التالي (${((indexSolution + 1) % solutionsAuto.length) + 1}/${solutionsAuto.length})` : `Prochaine configuration possible (${((indexSolution + 1) % solutionsAuto.length) + 1}/${solutionsAuto.length})`) : (ar ? 'توزيع تلقائي للصّالات' : 'Prochaine configuration possible')}
                </button>
                <button className="btn btn-warning" style={{ fontWeight: 700 }} onClick={demarrerReaffectation}>
                  ✏️ {ar ? 'تغيير يدوي للصّالات' : 'Réaffectation manuelle'}
                </button>
              </div>
            )}
            {modeReaffectation && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef9c3', padding: '8px 14px', borderRadius: 8, border: '2px solid #eab308' }}>
                <span style={{ fontSize: '0.85rem', color: '#854d0e', fontWeight: 600 }}>
                  {ar ? '⚠ وضع إعادة التوزيع اليدوي' : '⚠ Mode réaffectation manuelle'}
                </span>
                <button className="btn btn-success btn-sm" onClick={validerReaffectation}>✓ {ar ? 'تحقق' : 'Valider'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setModeReaffectation(false); setReaffectations({}) }}>{ar ? 'إلغاء' : 'Annuler'}</button>
              </div>
            )}
          </div>

          {/* ── Sauvegardes nommées d'allocations ── */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border, #e5e7eb)' }}>
            {allocation && (
              <button className="btn btn-secondary btn-sm" onClick={handleSauvegarderNommee} disabled={savingSnapshot}>
                💾 {savingSnapshot ? (ar ? 'جارٍ الحفظ…' : 'Sauvegarde…') : (ar ? 'حفظ هذا التوزيع' : 'Sauvegarder cette configuration')}
              </button>
            )}
            {sauvegardesAllocations.length > 0 && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  {ar ? 'التوزيعات المحفوظة :' : 'Configurations sauvegardées :'}
                </span>
                <select
                  value={sauvegardeSelectionnee}
                  onChange={e => setSauvegardeSelectionnee(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border, #ccc)', fontSize: '0.85rem', direction: 'auto' }}>
                  <option value="">{ar ? '— اختر —' : '— Choisir —'}</option>
                  {sauvegardesAllocations.map(s => (
                    <option key={s.id} value={s.id}>{s.nom} ({new Date(s.created_at).toLocaleDateString('fr-FR')})</option>
                  ))}
                </select>
                {sauvegardeSelectionnee && (() => {
                  const s = sauvegardesAllocations.find(x => x.id === sauvegardeSelectionnee)
                  return (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => handleChargerSauvegarde(sauvegardeSelectionnee)}>
                        ↩ {ar ? 'استرجاع' : 'Charger'}
                      </button>
                      <button className="btn btn-ghost btn-sm" title={ar ? 'إعادة تسمية' : 'Renommer'} onClick={() => handleRenommerSauvegarde(sauvegardeSelectionnee, s?.nom)}>
                        ✏️
                      </button>
                      <button className="btn btn-ghost btn-sm" title={ar ? 'حذف' : 'Supprimer'} onClick={() => handleSupprimerSauvegarde(sauvegardeSelectionnee, s?.nom)} style={{ color: 'var(--danger, #dc2626)' }}>
                        🗑
                      </button>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {allocation && Object.keys(allocation.affectations).length > 0 ? (
        <>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-value">{totalEleves}</div><div className="stat-label">{ar ? 'مجموع الطلبات' : 'Demandes totales'}</div></div>
            <div className="stat-card success"><div className="stat-value">{totalAcceptes}</div><div className="stat-label">{ar ? 'المقبولون' : 'Élèves acceptés'}</div></div>
            <div className="stat-card warning"><div className="stat-value">{totalAttente}</div><div className="stat-label">{ar ? 'قائمة الانتظار' : "Liste d'attente"}</div></div>
            <div className="stat-card info"><div className="stat-value">{tauxGlobal}%</div><div className="stat-label">{ar ? 'نسبة الإشغال' : 'Remplissage global'}</div></div>
            <div className="stat-card neutral"><div className="stat-value">{totalCapacite}</div><div className="stat-label">{ar ? 'الطاقة الإجمالية' : 'Capacité totale'}</div></div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              {ar ? 'تم الحساب بتاريخ' : 'Calculé le'} {new Date(allocation.date).toLocaleString('fr-FR')}
            </span>
            <button className="btn btn-success" onClick={() => exporterAllocationExcel(allocation, eleves, config, terminologie)}>
              📊 {ar ? 'تصدير النتيجة (Excel)' : 'Exporter le résultat (Excel)'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {config.reglesAge.map(r => {
              const c = getNiveauColor(r.niveauId, config.reglesAge)
              return <span key={r.niveauId} style={{ background: c.bg, color: 'white', padding: '4px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700, direction: 'auto' }}>{r.label}</span>
            })}
          </div>

          {config.reglesAge.map(r => {
            const resRaw = allocation.affectations[r.niveauId]
            if (!resRaw) return null
            const res = normaliserRes(resRaw, r.niveauId)
            return <CarteNiveau key={r.niveauId} niveauId={r.niveauId} label={r.label} res={res}
              eleves={eleves} config={config} terminologie={terminologie}
              groupesFiges={groupesFiges} onFiger={handleFiger}
              onOuvrirModal={(eleve, niveauActuel, classeActuelle) => setModalEleve({ eleve, niveauActuel, classeActuelle })}
              onRetirer={handleRetirer} lectureSeule={lectureSeule} langue={langue}
              modeReaffectation={modeReaffectation} toutesLesSalles={config.salles}
              onChangerSalle={(cid, sid) => setReaffectations(prev => ({ ...prev, [cid]: sid }))}
              sallesDejaChoisies={reaffectations} />
          })}

          {elevesHorsGroupe.length > 0 && (
            <div className="card" style={{ border: '2px dashed var(--warning)' }}>
              <div className="card-title">🚫 {ar ? `تلاميذ بدون قسم (${elevesHorsGroupe.length})` : `Élèves sans groupe (${elevesHorsGroupe.length})`}</div>
              <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                {ar ? 'هؤلاء التلاميذ تمت إزالتهم يدوياً. يمكنك إضافتهم إلى قسم أو تركهم في قائمة الانتظار.' : "Ces élèves ont été retirés manuellement. Vous pouvez les ajouter à un groupe ou les laisser en liste d'attente."}
              </div>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)', direction: 'auto' }}>{c.label}</th>
                    ))}
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{ar ? 'السن' : 'Âge'}</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{ar ? 'المستوى المتوافق' : 'Niveau compatible'}</th>
                    {!lectureSeule && <th style={{ width: 140 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {elevesHorsGroupe.map((e, idx) => {
                    const niveauCompat = config.reglesAge.find(r => e.age >= r.ageMin && e.age <= r.ageMax)
                    const c = niveauCompat ? getNiveauColor(niveauCompat.niveauId, config.reglesAge) : DEFAULT_COLOR
                    return (
                      <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                        {config.champs.filter(ch => ch.type !== 'computed').map(ch => (
                          <td key={ch.id} style={{ padding: '6px 10px', direction: 'auto' }}>{e[ch.id] || '—'}</td>
                        ))}
                        <td style={{ padding: '6px 10px' }}><strong>{e.age}</strong> {ar ? 'سنوات' : 'ans'}</td>
                        <td style={{ padding: '6px 10px' }}>
                          {niveauCompat && <span style={{ background: c.bg, color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700, direction: 'auto' }}>{niveauCompat.label}</span>}
                        </td>
                        {!lectureSeule && (
                          <td style={{ padding: '6px 10px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => setModalEleve({ eleve: e, niveauActuel: niveauCompat?.niveauId, classeActuelle: null })}>
                              {ar ? '+ إضافة إلى قسم' : '+ Ajouter à un groupe'}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="card">
            <div className="card-title">
              📊 {ar
                ? (solutionsAuto.length > 0 ? `جدول الملخص : التوزيع ${indexSolution + 1} من ${solutionsAuto.length}` : 'جدول الملخص')
                : (solutionsAuto.length > 0 ? `Tableau de synthèse : configuration ${indexSolution + 1} parmi ${solutionsAuto.length}` : 'Tableau de synthèse')}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--paper2)' }}>
                    {[
                      ar ? 'المستوى' : 'Niveau',
                      ar ? 'فوج' : terminologie.groupe,
                      ar ? 'الصّالة' : 'Salle',
                      ar ? 'الاسم الكامل' : 'Nom complet',
                      ar ? 'الطاقة' : 'Capacité',
                      ar ? 'التلاميذ' : 'Élèves',
                      ar ? 'شاغر' : 'Libres',
                      ar ? 'الإشغال' : 'Remplissage',
                      ...(!lectureSeule ? [ar ? 'الحالة' : 'État'] : [])
                    ].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--ink-light)', borderBottom: '2px solid var(--paper3)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.reglesAge.map(r => {
                    const resRaw = allocation.affectations[r.niveauId]
                    if (!resRaw) return null
                    const res = normaliserRes(resRaw, r.niveauId)
                    const couleur = getNiveauColor(r.niveauId, config.reglesAge)
                    return res.classes.map((cls, idx) => {
                      const nb = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
                      const cap = cls.salle?.capacite || 1
                      const taux = ((nb / cap) * 100).toFixed(0)
                      // Logique +/-
                      const estFige = groupesFiges.has(cls.classeId)
                      const autresClasses = res.classes.filter(c => c.classeId !== cls.classeId && !groupesFiges.has(c.classeId))
                      const nbFn = c => eleves.filter(e => c.elevesIds?.includes(e.id)).length
                      // + : groupe non figé, salle pas pleine ET un autre groupe non figé a des élèves à donner
                      const donneur = autresClasses.filter(c => nbFn(c) > 0).sort((a, b) => nbFn(b) - nbFn(a))[0]
                      const canPlus = !estFige && nb < cap && !!donneur
                      // - : groupe non figé, a des élèves ET un autre groupe non figé a de la place
                      const receveur = autresClasses.filter(c => {
                        const capC = c.salle?.capacite || 1
                        return nbFn(c) < capC
                      }).sort((a, b) => nbFn(a) - nbFn(b))[0]
                      const canMoins = !estFige && nb > 0 && !!receveur
                      const btnBase = { border: 'none', borderRadius: 6, width: 22, height: 22, fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' }
                      return (
                        <tr key={cls.classeId} style={{ background: couleur.light + '88', borderBottom: `1px solid ${couleur.badge}44` }}>
                          {idx === 0 && (
                            <td rowSpan={res.classes.length} style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle', borderRight: `3px solid ${couleur.bg}` }}>
                              <span style={{ background: couleur.bg, color: 'white', padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem', direction: 'auto', display: 'inline-block' }}>{r.label}</span>
                              {res.nbAttente > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>⏳ {res.nbAttente}</div>}
                            </td>
                          )}
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: couleur.bg }}>{ar ? `فوج ${cls.classeNum}` : `${terminologie.groupe} ${cls.classeNum}`}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}><strong>{cls.salle?.nom || '—'}</strong></td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--ink-muted)', direction: 'auto' }}>{cls.salle?.nomComplet || '—'}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>{cap}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {!lectureSeule ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <button
                                  disabled={!canMoins}
                                  onClick={() => canMoins && transfererEleve(cls.classeId, receveur.classeId, r.niveauId)}
                                  title={canMoins ? (ar ? `نقل تلميذ إلى فوج ${receveur.classeNum}` : `Déplacer un élève vers ${terminologie.groupe} ${receveur?.classeNum}`) : ''}
                                  style={{ ...btnBase, background: canMoins ? '#f97316' : '#e5e7eb', color: canMoins ? 'white' : '#9ca3af', opacity: canMoins ? 1 : 0.5 }}>−</button>
                                <span style={{ background: couleur.bg, color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 700, minWidth: 28, textAlign: 'center', display: 'inline-block' }}>{nb}</span>
                                <button
                                  disabled={!canPlus}
                                  onClick={() => canPlus && transfererEleve(donneur.classeId, cls.classeId, r.niveauId)}
                                  title={canPlus ? (ar ? `أخذ تلميذ من فوج ${donneur.classeNum}` : `Prendre un élève du ${terminologie.groupe} ${donneur?.classeNum}`) : ''}
                                  style={{ ...btnBase, background: canPlus ? '#22c55e' : '#e5e7eb', color: canPlus ? 'white' : '#9ca3af', opacity: canPlus ? 1 : 0.5 }}>+</button>
                              </div>
                            ) : (
                              <span style={{ background: couleur.bg, color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 700 }}>{nb}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}><span style={{ color: (cap - nb) > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{cap - nb}</span></td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                              <div style={{ width: 40, height: 6, background: 'var(--paper3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${taux}%`, height: '100%', background: couleur.bg, borderRadius: 3 }} />
                              </div>
                              <span style={{ fontWeight: 700 }}>{taux}%</span>
                            </div>
                          </td>
                          {!lectureSeule && <td style={{ padding: '10px 12px', textAlign: 'center' }}>{groupesFiges.has(cls.classeId) ? <span style={{ color: couleur.bg, fontSize: '0.8rem' }}>🔒</span> : <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>—</span>}</td>}
                        </tr>
                      )
                    })
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-muted)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 10 }}>
            {ar ? 'لم يتم حساب التوزيع بعد' : 'Aucune allocation calculée'}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {eleves.length === 0
              ? (ar ? 'ابدأ بإدخال التسجيلات ثم أطلق الحساب.' : 'Commencez par saisir des inscriptions, puis lancez le calcul.')
              : (ar ? `${eleves.length} تسجيل في الانتظار. انقر على "حساب التوزيع".` : `${eleves.length} inscription(s) en attente. Cliquez sur "Calculer l'allocation".`)}
          </div>
        </div>
      )}

      {/* ── Boutons en bas de page ── */}
      {allocation && (
        <div className="card no-print" style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {!lectureSeule && (
              <>
                <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0 || calcul}>
                  {calcul ? (ar ? '⏳ جاري الحساب…' : '⏳ Calcul en cours…') : (ar ? '▶ إيجاد توزيع ممكن' : "▶ Trouver une configuration d'affectations")}
                </button>
                <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
                  🖨 {ar ? 'طباعة' : 'Imprimer'}
                </button>
              </>
            )}
            {!modeReaffectation && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" style={{ fontWeight: 700, opacity: solutionsAuto.length > 1 ? 1 : 0.5, cursor: solutionsAuto.length > 1 ? 'pointer' : 'not-allowed' }}
                  disabled={solutionsAuto.length <= 1}
                  onClick={() => appliquerSolution((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length)}>
                  ⏮ {solutionsAuto.length > 0 ? (ar ? `التوزيع السابق (${((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length) + 1}/${solutionsAuto.length})` : `Configuration précédente (${((indexSolution - 1 + solutionsAuto.length) % solutionsAuto.length) + 1}/${solutionsAuto.length})`) : (ar ? 'التوزيع السابق' : 'Configuration précédente')}
                </button>
                <button className="btn btn-primary" style={{ fontWeight: 700 }} onClick={reaffectationAutomatique}>
                  ⏭ {solutionsAuto.length > 0 ? (ar ? `التوزيع التالي (${((indexSolution + 1) % solutionsAuto.length) + 1}/${solutionsAuto.length})` : `Prochaine configuration possible (${((indexSolution + 1) % solutionsAuto.length) + 1}/${solutionsAuto.length})`) : (ar ? 'توزيع تلقائي للصّالات' : 'Prochaine configuration possible')}
                </button>
                <button className="btn btn-warning" style={{ fontWeight: 700 }} onClick={demarrerReaffectation}>
                  ✏️ {ar ? 'تغيير يدوي للصّالات' : 'Réaffectation manuelle'}
                </button>
              </div>
            )}
            {modeReaffectation && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef9c3', padding: '8px 14px', borderRadius: 8, border: '2px solid #eab308' }}>
                <span style={{ fontSize: '0.85rem', color: '#854d0e', fontWeight: 600 }}>
                  {ar ? '⚠ وضع إعادة التوزيع اليدوي' : '⚠ Mode réaffectation manuelle'}
                </span>
                <button className="btn btn-success btn-sm" onClick={validerReaffectation}>✓ {ar ? 'تحقق' : 'Valider'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setModeReaffectation(false); setReaffectations({}) }}>{ar ? 'إلغاء' : 'Annuler'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalEleve && (
        <ModalAjouterAGroupe eleve={modalEleve.eleve} allocation={allocation} config={config}
          eleves={eleves} onConfirm={confirmerAjout} onClose={() => setModalEleve(null)}
          terminologie={terminologie} langue={langue} />
      )}
    </div>
  )
}
