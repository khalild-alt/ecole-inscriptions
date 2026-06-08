// src/pages/PageAllocation.jsx
import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabase'

// ── Couleurs par rang de niveau (stables peu importe l'identifiant) ──────────
const RANG_COLORS = [
  { bg: '#1a5fa0', light: '#dbeafe', text: '#1e3a5f', badge: '#3b82f6', xl: 'FF1a5fa0' }, // bleu
  { bg: '#2d7a4f', light: '#dcfce7', text: '#14532d', badge: '#22c55e', xl: 'FF2d7a4f' }, // vert
  { bg: '#b07d1a', light: '#fef9c3', text: '#713f12', badge: '#eab308', xl: 'FFb07d1a' }, // orange
  { bg: '#6b21a8', light: '#f3e8ff', text: '#3b0764', badge: '#a855f7', xl: 'FF6b21a8' }, // violet
  { bg: '#be123c', light: '#ffe4e6', text: '#881337', badge: '#f43f5e', xl: 'FFbe123c' }, // rouge
  { bg: '#0f766e', light: '#ccfbf1', text: '#134e4a', badge: '#14b8a6', xl: 'FF0f766e' }, // teal
]
const DEFAULT_COLOR = { bg: '#374151', light: '#f3f4f6', text: '#111827', badge: '#6b7280', xl: 'FF374151' }

// Cache pour assigner une couleur stable à chaque niveauId
const _niveauColorCache = {}

function getNiveauColor(niveauId, reglesAge) {
  if (_niveauColorCache[niveauId]) return _niveauColorCache[niveauId]
  if (reglesAge) {
    const idx = reglesAge.findIndex(r => r.niveauId === niveauId)
    if (idx >= 0) {
      _niveauColorCache[niveauId] = RANG_COLORS[idx % RANG_COLORS.length]
      return _niveauColorCache[niveauId]
    }
  }
  return DEFAULT_COLOR
}

function nomSalle(salle) {
  if (!salle) return '—'
  return salle.nomComplet ? `${salle.nom} — ${salle.nomComplet}` : salle.nom
}

// ── Modal pour ajouter/déplacer un langue === 'ar' ? 'تلميذ' : 'élève' vers un groupe ─────────────────────
function ModalAjouterAGroupe({ eleve, allocation, config, eleves, onConfirm, onClose, terminologie, langue }) {
  const [niveauCible, setNiveauCible] = useState('')
  const [classeCible, setClasseCible] = useState('')

  const niveauxCompatibles = config.reglesAge.filter(r => eleve.age >= r.ageMin && eleve.age <= r.ageMax)

  const classesDisponibles = niveauCible && allocation?.affectations?.[niveauCible]?.classes
    ? allocation.affectations[niveauCible].classes
    : []

  const terme = terminologie?.groupe || langue === 'ar' ? 'الفوج' : 'Groupe'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>
          Ajouter : {eleve.prenom} {eleve.nom}
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>
          Âge : <strong>{eleve.age} langue === 'ar' ? 'سنوات' : 'ans'</strong> — niveaux compatibles : {niveauxCompatibles.map(r => r.label).join(', ')}
        </div>

        <div className="form-group">
          <label className="form-label">Niveau de destination</label>
          <select className="form-input" value={niveauCible} onChange={e => { setNiveauCible(e.target.value); setClasseCible('') }}>
            <option value="">— Choisir —</option>
            {niveauxCompatibles.map(r => (
              <option key={r.niveauId} value={r.niveauId}>{r.label}</option>
            ))}
          </select>
        </div>

        {niveauCible && (
          <div className="form-group">
            <label className="form-label">{terme} de destination</label>
            {classesDisponibles.length === 0 ? (
              <div className="alert alert-warning">Aucun groupe dlangue === 'ar' ? 'سنوات' : 'ans' ce niveau.</div>
            ) : (
              <select className="form-input" value={classeCible} onChange={e => setClasseCible(e.target.value)}>
                <option value="">— Choisir —</option>
                {classesDisponibles.map(c => {
                  const nbActuels = eleves.filter(e => c.elevesIds?.includes(e.id)).length
                  const plein = nbActuels >= c.salle.capacite
                  return (
                    <option key={c.classeId} value={c.classeId}>
                      {terme} {c.classeNum} — {nomSalle(c.salle)} ({nbActuels}/{c.salle.capacite}){plein ? ' ⚠ PLEIN' : ''}
                    </option>
                  )
                })}
              </select>
            )}
          </div>
        )}

        {classeCible && (() => {
          const cls = classesDisponibles.find(c => c.classeId === classeCible)
          const nbActuels = cls ? eleves.filter(e => cls.elevesIds?.includes(e.id)).length : 0
          if (cls && nbActuels >= cls.salle.capacite) {
            return <div className="alert alert-warning">⚠ Ce groupe est plein ({nbActuels}/{cls.salle.capacite}). L'langue === 'ar' ? 'تلميذ' : 'élève' sera ajouté en dépassement.</div>
          }
          return null
        })()}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!classeCible}
            onClick={() => onConfirm(niveauCible, classeCible)}>
            ✓ Ajouter dlangue === 'ar' ? 'سنوات' : 'ans' ce groupe
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ── Carte d'un groupe ────────────────────────────────────────────────────────
function CarteGroupe({ classe, niveauId, niveauLabel, eleves, config, terminologie, fige, onFiger, onOuvrirModal, onRetirer, lectureSeule }) {
  const taux = parseFloat(classe.tauxRemplissage)
  const terme = terminologie?.groupe || langue === 'ar' ? 'الفوج' : 'Groupe'
  const couleur = getNiveauColor(niveauId, config.reglesAge)
  const elevesGroupe = eleves.filter(e => classe.elevesIds && classe.elevesIds.includes(e.id))
  // Libellé bilingue : "Année 1 — فوج / Groupe 1 — S3 — Nom salle"
  const nomSalleFull = classe.salle ? (classe.salle.nomComplet ? `${classe.salle.nom} — ${classe.salle.nomComplet}` : classe.salle.nom) : '—'

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden',
      border: fige ? `2px solid ${couleur.bg}` : `1.5px solid ${couleur.badge}33`,
    }}>
      {/* En-tête coloré selon le niveau */}
      <div style={{
        background: fige ? couleur.bg : couleur.bg + 'dd',
        color: 'white', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {fige && <span>🔒</span>}
            <span style={{ direction: 'auto' }}>{niveauLabel}</span>
            <span style={{ opacity: 0.6 }}>—</span>
            <span>
              <span style={{ fontFamily: "'Noto Slangue === 'ar' ? 'سنوات' : 'ans' Arabic', slangue === 'ar' ? 'سنوات' : 'ans'-serif", direction: 'rtl' }}>فوج {classe.classeNum}</span>
              <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
              <span>{terme} {classe.classeNum}</span>
            </span>
            <span style={{ opacity: 0.6 }}>—</span>
            <span style={{ direction: 'auto' }}>{nomSalleFull}</span>
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
            {elevesGroupe.length}/{classe.salle?.capacite} langue === 'ar' ? 'تلميذ' : 'élève's · {((elevesGroupe.length / (classe.salle?.capacite || 1)) * 100).toFixed(0)}%
            {classe.salle?.capacite - elevesGroupe.length > 0 && ` · ${classe.salle.capacite - elevesGroupe.length} {langue === 'ar' ? 'مقعد شاغر' : 'place(s) libre(s)'}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!lectureSeule && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', fontSize: '0.78rem' }}
              onClick={() => onFiger(classe.classeId, !fige)}
            >
              {fige ? langue === 'ar' ? '🔓 تحرير' : '🔓 Libérer' : langue === 'ar' ? '🔒 تثبيت' : '🔒 Figer'}
            </button>
          )}
          <div style={{ textAlign: 'right', minWidth: 48 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>{elevesGroupe.length > 0 ? ((elevesGroupe.length / (classe.salle?.capacite || 1)) * 100).toFixed(0) : 0}%</div>
          </div>
        </div>
      </div>

      {/* Barre de remplissage */}
      <div style={{ height: 6, background: couleur.light }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (elevesGroupe.length / (classe.salle?.capacite || 1)) * 100)}%`,
          background: couleur.bg,
          trlangue === 'ar' ? 'سنوات' : 'ans'ition: 'width 0.3s'
        }} />
      </div>

      {/* Liste des langue === 'ar' ? 'تلميذ' : 'élève's */}
      <div style={{ padding: '10px 16px' }}>
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 6 }}>
            👥 {elevesGroupe.length} langue === 'ar' ? 'تلميذ' : 'élève'{elevesGroupe.length > 1 ? 's' : ''} ▾
          </summary>
          <div style={{ overflowX: 'auto', maxHeight: 260, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: couleur.light }}>
                <tr>
                  <th style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                  {config.champs.filter(c => c.type !== 'computed').map(c => (
                    <th key={c.id} style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', direction: 'auto', textAlign: 'left' }}>{c.label}</th>
                  ))}
                  <th style={{ padding: '4px 8px', color: couleur.text, fontWeight: 700, fontSize: '0.75rem', textAlign: 'left' }}>Âge</th>
                  {!lectureSeule && <th style={{ width: 100 }}></th>}
                </tr>
              </thead>
              <tbody>
                {elevesGroupe.map((e, idx) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${couleur.light}` }}>
                    <td style={{ padding: '5px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <td key={c.id} style={{ padding: '5px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                    ))}
                    <td style={{ padding: '5px 8px' }}><strong>{e.age}</strong> langue === 'ar' ? 'سنوات' : 'ans'</td>
                    {!lectureSeule && (
                      <td style={{ padding: '5px 8px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onOuvrirModal(e, niveauId, classe.classeId)}>↔</button>
                          <button className="btn btn-danger btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onRetirer(e.id, classe.classeId, niveauId)}
                            title=langue === 'ar' ? 'إزالة من القسم' : 'Retirer de ce groupe'>✕</button>
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

// ── Carte d'un niveau ────────────────────────────────────────────────────────
function CarteNiveau({ niveauId, label, res, eleves, config, terminologie, groupesFiges, onFiger, onOuvrirModal, onRetirer, lectureSeule }) {
  const couleur = getNiveauColor(niveauId, config.reglesAge)
  const enAttente = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')
  const elevesNiveau = eleves.filter(e => e.niveauId === niveauId)

  return (
    <div style={{ marginBottom: 16, borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: `2px solid ${couleur.badge}44`, boxShadow: 'var(--shadow)' }}>
      {/* En-tête du niveau */}
      <div style={{ background: couleur.light, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${couleur.badge}44` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ background: couleur.bg, color: 'white', borderRadius: 8, padding: '4px 16px', fontWeight: 700, fontSize: '0.95rem', direction: 'auto' }}>
            {label}
          </span>
          <span style={{ fontSize: '0.85rem', color: couleur.text }}>
            {res.classes.length} {terminologie?.groupe || 'langue === 'ar' ? 'مجموعة' : 'groupe'}{res.classes.length > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span style={{ color: couleur.text }}>{elevesNiveau.length} langue === 'ar' ? 'طلبات' : 'demandes'</span>
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ {res.nbAcceptes} langue === 'ar' ? 'مقبولون' : 'acceptés'</span>
          {enAttente.length > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⏳ {enAttente.length} langue === 'ar' ? 'في الانتظار' : 'en attente'</span>}
        </div>
      </div>

      <div style={{ padding: '12px', background: 'white' }}>
        {res.classes.map(cls => (
          <CarteGroupe
            key={cls.classeId}
            classe={cls}
            niveauId={niveauId}
            niveauLabel={label}
            eleves={eleves}
            config={config}
            terminologie={terminologie}
            fige={groupesFiges.has(cls.classeId)}
            onFiger={onFiger}
            onOuvrirModal={onOuvrirModal}
            onRetirer={onRetirer}
            lectureSeule={lectureSeule}
          />
        ))}

        {/* Liste d'attente */}
        {enAttente.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
              ⏳ langue === 'ar' ? 'قائمة الانتظار :' : langue === 'ar' ? 'قائمة الانتظار :' : "Liste d'attente :" {enAttente.length} langue === 'ar' ? 'تلميذ' : 'élève'{enAttente.length > 1 ? 's' : ''} ▾
            </summary>
            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', direction: 'auto', textAlign: 'left' }}>{c.label}</th>
                    ))}
                    <th style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', textAlign: 'left' }}>Âge</th>
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
                      <td style={{ padding: '4px 8px' }}>{e.age} langue === 'ar' ? 'سنوات' : 'ans'</td>
                      {!lectureSeule && (
                        <td style={{ padding: '4px 8px' }}>
                          <button className="btn btn-success btn-sm" style={{ fontSize: '0.72rem' }}
                            onClick={() => onOuvrirModal(e, niveauId, null)}>+ Ajouter</button>
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

// ── Export Excel allocation ─────────────────────────────────────────────────
function exporterAllocationExcel(allocation, eleves, config, terminologie) {
  const wb = XLSX.utils.book_new()
  const terme = terminologie?.groupe || langue === 'ar' ? 'الفوج' : 'Groupe'
  const champs = config.champs.filter(c => c.type !== 'computed')
  const champsHeaders = champs.map(c => c.label)

  // Couleurs Excel par rang (ARGB) — identiques à l'interface
  function getCouleurXL(niveauId) {
    const c = getNiveauColor(niveauId, config.reglesAge)
    return c.xl || 'FF374151'
  }

  function styleCellule(ws, ref, bgColor, bold = false) {
    if (!ws[ref]) return
    ws[ref].s = {
      fill: { fgColor: { rgb: bgColor }, patternType: 'solid' },
      font: { color: { rgb: 'FFFFFFFF' }, bold, name: 'Arial', sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    }
  }

  function styleLigne(ws, row, nbCols, bgColor, textColor = 'FF000000') {
    for (let c = 0; c < nbCols; c++) {
      const ref = XLSX.utils.encode_cell({ r: row, c })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].s = {
        fill: { fgColor: { rgb: bgColor.replace('#','FF') }, patternType: 'solid' },
        font: { color: { rgb: textColor }, name: 'Arial', sz: 10 },
        alignment: { wrapText: true },
        border: { bottom: { style: 'thin', color: { rgb: 'FFdddddd' } } }
      }
    }
  }

  // ── Feuille par niveau ──
  for (const r of config.reglesAge) {
    const resRaw = allocation.affectations[r.niveauId]
    if (!resRaw) continue
    const res = resRaw.classes ? resRaw : { ...resRaw, classes: resRaw.salle ? [{ classeId: r.niveauId+'_c1', classeNum: 1, salle: resRaw.salle, elevesIds: eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte').map(e => e.id) }] : [] }

    const couleurXL = getCouleurXL(r.niveauId)
    const couleurLight = couleurXL.replace(/^FF/, 'FFe') // approx
    const rows = []

    for (const cls of res.classes) {
      const elevesGroupe = eleves.filter(e => cls.elevesIds?.includes(e.id))
      // En-tête du groupe
      const titreGroupe = [`${r.label} — ${terme} ${cls.classeNum} — ${cls.salle?.nom || ''}${cls.salle?.nomComplet ? ' — ' + cls.salle.nomComplet : ''} (${elevesGroupe.length}/${cls.salle?.capacite || '?'})`]
      rows.push(titreGroupe)
      // En-tête colonnes
      rows.push(['#', ...champsHeaders, 'Âge'])
      // Élèves
      elevesGroupe.forEach((e, idx) => {
        rows.push([idx + 1, ...champs.map(c => e[c.id] || ''), e.age || ''])
      })
      rows.push([]) // Ligne vide entre groupes
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 5 }, ...champsHeaders.map(() => ({ wch: 18 })), { wch: 8 }]

    // Colorier les en-têtes de groupe
    let rowIdx = 0
    for (const cls of res.classes) {
      const elevesGroupe = eleves.filter(e => cls.elevesIds?.includes(e.id))
      const ref = XLSX.utils.encode_cell({ r: rowIdx, c: 0 })
      if (!ws[ref]) ws[ref] = { t: 's', v: '' }
      ws[ref].s = { fill: { fgColor: { rgb: couleurXL }, patternType: 'solid' }, font: { color: { rgb: 'FFFFFFFF' }, bold: true, sz: 11 } }
      ws['!merges'] = ws['!merges'] || []
      ws['!merges'].push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: champsHeaders.length + 1 } })
      rowIdx += 2 + elevesGroupe.length + 1 // titre + entête + langue === 'ar' ? 'تلميذ' : 'élève's + vide
    }

    const sheetName = r.label.replace(/[\\/*\[\]?:]/g, '').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName || (langue === 'ar' ? 'المستوى' : 'Niveau' + r.niveauId))
  }

  // ── Feuille synthèse ──
  const synthRows = [
    [langue === 'ar' ? 'المستوى' : 'Niveau', terme, langue === 'ar' ? 'الصّالة' : 'Salle', langue === 'ar' ? 'الاسم الكامل' : 'Nom complet', langue === 'ar' ? 'الطاقة' : 'Capacité', langue === 'ar' ? 'التلاميذ' : 'Élèves', langue === 'ar' ? 'مقاعد شاغرة' : 'Places libres', langue === 'ar' ? 'الإشغال' : 'Remplissage']
  ]
  for (const r of config.reglesAge) {
    const resRaw = allocation.affectations[r.niveauId]
    if (!resRaw) continue
    const res = resRaw.classes ? resRaw : { ...resRaw, classes: resRaw.salle ? [{ classeId: r.niveauId+'_c1', classeNum: 1, salle: resRaw.salle, elevesIds: eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte').map(e => e.id) }] : [] }
    for (const cls of res.classes) {
      const nbEleves = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
      const cap = cls.salle?.capacite || 0
      synthRows.push([
        r.label, `${terme} ${cls.classeNum}`, cls.salle?.nom || '—', cls.salle?.nomComplet || '—',
        cap, nbEleves, Math.max(0, cap - nbEleves), cap > 0 ? ((nbEleves / cap) * 100).toFixed(0) + '%' : '—'
      ])
    }
  }
  const wsSynth = XLSX.utils.aoa_to_sheet(synthRows)
  wsSynth['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsSynth, langue === 'ar' ? 'ملخص التوزيع' : 'Synthèse')

  // ── Feuille non-alloués ──
  const nonAlloues = eleves.filter(e => e.statut === 'liste_attente')
  if (nonAlloues.length > 0) {
    const naRows = [['#', ...champsHeaders, 'Âge', langue === 'ar' ? 'المستوى' : 'Niveau']]
    nonAlloues.forEach((e, idx) => {
      const niv = config.reglesAge.find(r => r.niveauId === e.niveauId)
      naRows.push([idx + 1, ...champs.map(c => e[c.id] || ''), e.age || '', niv?.label || '—'])
    })
    const wsNA = XLSX.utils.aoa_to_sheet(naRows)
    wsNA['!cols'] = [{ wch: 5 }, ...champsHeaders.map(() => ({ wch: 18 })), { wch: 8 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsNA, langue === 'ar' ? 'غير موزعين' : 'Non alloués')
  }

  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  XLSX.writeFile(wb, `allocation_${date}.xlsx`)
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function PageAllocation({ lectureSeule, nomEtab, anneeLabel }) {
  const { config, eleves, setEleves, allocation, setAllocation, lancerOptimisation, annee } = useApp()
  const { langue } = useI18n()
  const toast = useToast()
  const terminologie = config.terminologie || DEFAULT_CONFIG.terminologie || { groupe: langue === 'ar' ? 'الفوج' : 'Groupe', annee: 'Année' }

  const [groupesFiges, setGroupesFiges] = useState(() =>
    allocation?.groupesFiges ? new Set(allocation.groupesFiges) : new Set()
  )
  const [calcul, setCalcul] = useState(false)
  const [modalEleve, setModalEleve] = useState(null) // { eleve, niveauActuel, classeActuelle }
  // elevesHorsGroupe : langue === 'ar' ? 'تلميذ' : 'élève's retirés manuellement de tout groupe
  const [elevesHorsGroupe, setElevesHorsGroupe] = useState([])

  async function handleOptimiser() {
    if (eleves.length === 0) { toast(langue === 'ar' ? 'لا توجد تسجيلات' : 'Aucune inscription à traiter', 'error'); return }
    setCalcul(true)
    setElevesHorsGroupe([])
    try {
      await lancerOptimisation()
      toast(langue === 'ar' ? 'تم حساب التوزيع' : 'Allocation calculée', 'success')
    } catch(e) {
      toast('Erreur : ' + e.message, 'error')
    }
    setCalcul(false)
  }

  // ── Sauvegarder l'allocation modifiée ─────────────────────────────────────
  async function sauvegarderAllocation(nouvellesAffectations, nouveauxFiges) {
    if (!annee?.id) return
    const aff = nouvellesAffectations || allocation.affectations
    const figes = Array.from(nouveauxFiges || groupesFiges)
    await supabase.from('allocations').delete().eq('annee_id', annee.id)
    await supabase.from('allocations').insert({
      annee_id: annee.id, affectations: aff,
      groupes_figes: figes, mode: 'multi',
      calculated_at: new Date().toISOString()
    })
    setAllocation({ affectations: aff, mode: 'multi', date: new Date().toISOString(), groupesFiges: figes })
  }

  // ── Figer/libérer un groupe ───────────────────────────────────────────────
  async function handleFiger(classeId, figer) {
    const n = new Set(groupesFiges)
    if (figer) n.add(classeId); else n.delete(classeId)
    setGroupesFiges(n)
    await sauvegarderAllocation(null, n)
    toast(figer ? '🔒 Groupe figé' : '🔓 Groupe libéré', 'info')
  }

  // ── Retirer un langue === 'ar' ? 'تلميذ' : 'élève' d'un groupe → hors groupe ───────────────────────────
  async function handleRetirer(eleveId, classeId, niveauId) {
    const aff = JSON.parse(JSON.stringify(allocation.affectations))
    for (const [nId, res] of Object.entries(aff)) {
      for (const cls of res.classes || []) {
        if (cls.elevesIds) cls.elevesIds = cls.elevesIds.filter(id => id !== eleveId)
      }
    }
    // Recalculer stats
    for (const [nId, res] of Object.entries(aff)) {
      if (res.classes) {
        res.nbAcceptes = res.classes.reduce((s, c) => s + (c.elevesIds?.length || 0), 0)
        res.nbAttente = eleves.filter(e => e.niveauId === nId && e.statut === 'liste_attente').length
      }
    }
    await supabase.from('eleves').update({ statut: 'liste_attente' }).eq('id', eleveId)
    setEleves(prev => prev.map(e => e.id === eleveId ? { ...e, statut: 'liste_attente' } : e))
    const eleve = eleves.find(e => e.id === eleveId)
    if (eleve) setElevesHorsGroupe(prev => [...prev, eleve])
    await sauvegarderAllocation(aff, null)
    toast('Élève retiré du langue === 'ar' ? 'مجموعة' : 'groupe', 'info')
  }

  // ── Ajouter/déplacer un langue === 'ar' ? 'تلميذ' : 'élève' vers un groupe ─────────────────────────────
  async function confirmerAjout(niveauCible, classeIdCible) {
    if (!modalEleve || !allocation) return
    const { eleve, classeActuelle } = modalEleve
    const aff = JSON.parse(JSON.stringify(allocation.affectations))

    // Retirer de partout
    for (const res of Object.values(aff)) {
      for (const cls of res.classes || []) {
        if (cls.elevesIds) cls.elevesIds = cls.elevesIds.filter(id => id !== eleve.id)
      }
    }

    // Ajouter dlangue === 'ar' ? 'سنوات' : 'ans' le groupe cible
    const clsCible = aff[niveauCible]?.classes?.find(c => c.classeId === classeIdCible)
    if (clsCible) {
      if (!clsCible.elevesIds) clsCible.elevesIds = []
      clsCible.elevesIds.push(eleve.id)
    }

    // Recalculer stats
    for (const [nId, res] of Object.entries(aff)) {
      if (res.classes) {
        res.nbAcceptes = res.classes.reduce((s, c) => s + (c.elevesIds?.length || 0), 0)
      }
    }

    // Mettre à jour le statut
    await supabase.from('eleves').update({ statut: 'accepte', niveau_id: niveauCible }).eq('id', eleve.id)
    setEleves(prev => prev.map(e => e.id === eleve.id ? { ...e, statut: 'accepte', niveauId: niveauCible } : e))
    setElevesHorsGroupe(prev => prev.filter(e => e.id !== eleve.id))
    await sauvegarderAllocation(aff, null)
    setModalEleve(null)
    toast(langue === 'ar' ? `تمت إضافة ${eleve.prenom} ${eleve.nom} إلى القسم` : `${eleve.prenom} ${eleve.nom} ajouté au groupe`, 'success')
  }

  // Calculs stats
  const totalEleves = eleves.length
  const totalAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const totalAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const totalCapacite = allocation
    ? Object.values(allocation.affectations).reduce((s, r) => {
        if (r.classes) return s + r.classes.reduce((sc, c) => sc + (c.salle?.capacite || 0), 0)
        return s + (r.salle?.capacite || 0)
      }, 0)
    : 0
  const tauxGlobal = totalCapacite > 0 ? ((totalAcceptes / totalCapacite) * 100).toFixed(1) : 0

  // Normaliser vers format multi-classes
  function normaliserRes(r, niveauId) {
    if (r.classes) return r
    const elevesAcceptes = eleves.filter(e => e.niveauId === niveauId && e.statut === 'accepte')
    const elevesAttente = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')
    return {
      ...r,
      classes: r.salle ? [{ classeId: niveauId + '_c1', classeNum: 1, salle: r.salle, nbAcceptes: elevesAcceptes.length, placesLibres: Math.max(0, r.salle.capacite - elevesAcceptes.length), tauxRemplissage: r.salle.capacite > 0 ? ((elevesAcceptes.length / r.salle.capacite) * 100).toFixed(1) : '0', elevesIds: elevesAcceptes.map(e => e.id) }] : [],
      nbDemandes: elevesAcceptes.length + elevesAttente.length,
      nbAcceptes: elevesAcceptes.length,
      nbAttente: elevesAttente.length,
    }
  }

  return (
    <div className="page">
      <h2 className="page-title">{langue === 'ar' ? 'توزيع الأقسام' : langue === 'ar' ? 'توزيع الأقسام' : 'Allocation des salles'}</h2>

      {!lectureSeule && (
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0 || calcul}
              style={{ opacity: calcul ? 0.7 : 1 }}>
              {calcul ? '⏳ Calcul en cours…' : '▶ Calculer l\'allocation'}
            </button>
            {groupesFiges.size > 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--accent)' }}>🔒 {groupesFiges.size} groupe(s) figé(s)</span>
            )}
          </div>
        </div>
      )}

      {allocation && Object.keys(allocation.affectations).length > 0 ? (
        <>
          {/* Stats globales */}
          <div className="stats-row">
            <div className="stat-card"><div className="stat-value">{totalEleves}</div><div className="stat-label">Demandes totales</div></div>
            <div className="stat-card success"><div className="stat-value">{totalAcceptes}</div><div className="stat-label">Élèves langue === 'ar' ? 'مقبولون' : 'acceptés'</div></div>
            <div className="stat-card warning"><div className="stat-value">{totalAttente}</div><div className="stat-label">Liste d'attente</div></div>
            <div className="stat-card info"><div className="stat-value">{tauxGlobal}%</div><div className="stat-label">Remplissage global</div></div>
            <div className="stat-card neutral"><div className="stat-value">{totalCapacite}</div><div className="stat-label">Capacité totale</div></div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              {langue === 'ar' ? 'تم الحساب بتاريخ' : langue === 'ar' ? 'تم الحساب بتاريخ' : 'Calculé le'} {new Date(allocation.date).toLocaleString('fr-FR')}
            </span>
            <button className="btn btn-success" onClick={() => exporterAllocationExcel(allocation, eleves, config, terminologie)}>
              📊 {langue === 'ar' ? 'تصدير النتيجة (Excel)' : langue === 'ar' ? 'تصدير النتيجة (Excel)' : 'Exporter le résultat (Excel)'}
            </button>
          </div>

          {/* Légende couleurs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {config.reglesAge.map(r => {
              const c = getNiveauColor(r.niveauId, config.reglesAge)
              return (
                <span key={r.niveauId} style={{ background: c.bg, color: 'white', padding: '4px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700, direction: 'auto' }}>
                  {r.label}
                </span>
              )
            })}
          </div>

          {/* Niveaux */}
          {config.reglesAge.map(r => {
            const resRaw = allocation.affectations[r.niveauId]
            if (!resRaw) return null
            const res = normaliserRes(resRaw, r.niveauId)
            return (
              <CarteNiveau key={r.niveauId} niveauId={r.niveauId} label={r.label} res={res}
                eleves={eleves} config={config} terminologie={terminologie}
                groupesFiges={groupesFiges} onFiger={handleFiger}
                onOuvrirModal={(eleve, niveauActuel, classeActuelle) => setModalEleve({ eleve, niveauActuel, classeActuelle })}
                onRetirer={handleRetirer}
                lectureSeule={lectureSeule}
                langue={langue} />
            )
          })}

          {/* Élèves hors groupe */}
          {elevesHorsGroupe.length > 0 && (
            <div className="card" style={{ border: '2px dashed var(--warning)' }}>
              <div className="card-title">🚫 Élèves slangue === 'ar' ? 'سنوات' : 'ans' groupe ({elevesHorsGroupe.length})</div>
              <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                Ces langue === 'ar' ? 'تلميذ' : 'élève's ont été retirés manuellement. Vous pouvez les ajouter à un groupe ou les laisser en liste d'attente.
              </div>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)', direction: 'auto' }}>{c.label}</th>
                    ))}
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Âge</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Niveau compatible</th>
                    {!lectureSeule && <th style={{ width: 100 }}></th>}
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
                        <td style={{ padding: '6px 10px' }}><strong>{e.age}</strong> langue === 'ar' ? 'سنوات' : 'ans'</td>
                        <td style={{ padding: '6px 10px' }}>
                          {niveauCompat && <span style={{ background: c.bg, color: 'white', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700, direction: 'auto' }}>{niveauCompat.label}</span>}
                        </td>
                        {!lectureSeule && (
                          <td style={{ padding: '6px 10px' }}>
                            <button className="btn btn-success btn-sm" onClick={() => setModalEleve({ eleve: e, niveauActuel: niveauCompat?.niveauId, classeActuelle: null })}>
                              + Ajouter à un groupe
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

          {/* Tableau de synthèse */}
          <div className="card">
            <div className="card-title">📊 Tableau de synthèse</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Niveau</th><th>{terminologie.groupe}</th><th>Salle</th><th>Nom complet</th>
                    <th>Capacité</th><th>Élèves</th><th>Libres</th><th>Remplissage</th>
                    {!lectureSeule && <th>État</th>}
                  </tr>
                </thead>
                <tbody>
                  {config.reglesAge.map(r => {
                    const resRaw = allocation.affectations[r.niveauId]
                    if (!resRaw) return null
                    const res = normaliserRes(resRaw, r.niveauId)
                    const couleur = getNiveauColor(r.niveauId, config.reglesAge)
                    return res.classes.map((cls, idx) => {
                      const nbEleves = eleves.filter(e => cls.elevesIds?.includes(e.id)).length
                      return (
                        <tr key={cls.classeId}>
                          {idx === 0 && (
                            <td rowSpan={res.classes.length}>
                              <span style={{ background: couleur.bg, color: 'white', padding: '3px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.85rem', direction: 'auto' }}>{r.label}</span>
                              {res.nbAttente > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>⏳ {res.nbAttente} langue === 'ar' ? 'في الانتظار' : 'en attente'</div>}
                            </td>
                          )}
                          <td style={{ fontWeight: 600 }}>
                          <span style={{ fontFamily: "'Noto Slangue === 'ar' ? 'سنوات' : 'ans' Arabic', slangue === 'ar' ? 'سنوات' : 'ans'-serif" }}>فوج {cls.classeNum}</span>
                          <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
                          <span>{terminologie.groupe} {cls.classeNum}</span>
                        </td>
                          <td><strong>{cls.salle?.nom || '—'}</strong></td>
                          <td style={{ color: 'var(--ink-muted)', direction: 'auto' }}>{cls.salle?.nomComplet || '—'}</td>
                          <td>{cls.salle?.capacite || '—'}</td>
                          <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{nbEleves}</span></td>
                          <td><span style={{ color: (cls.salle?.capacite - nbEleves) > 0 ? 'var(--warning)' : 'var(--ink-muted)' }}>{cls.salle ? cls.salle.capacite - nbEleves : '—'}</span></td>
                          <td><span style={{ fontWeight: 700 }}>{cls.salle ? ((nbEleves / cls.salle.capacite) * 100).toFixed(0) : 0}%</span></td>
                          {!lectureSeule && (
                            <td>{groupesFiges.has(cls.classeId) ? <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>🔒</span> : <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>—</span>}</td>
                          )}
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
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 10 }}>Aucune allocation calculée</div>
          <div style={{ fontSize: '0.9rem' }}>
            {eleves.length === 0 ? langue === 'ar' ? 'ابدأ بإدخال التسجيلات ثم أطلق الحساب.' : 'Commencez par saisir des inscriptions, puis lancez le calcul.' : `${eleves.length} inscription(s) langue === 'ar' ? 'في الانتظار' : 'en attente'. Cliquez sur langue === 'ar' ? 'حساب التوزيع' : "Calculer l'allocation".`}
          </div>
        </div>
      )}

      {/* Modal ajouter/déplacer */}
      {modalEleve && (
        <ModalAjouterAGroupe
          eleve={modalEleve.eleve}
          allocation={allocation}
          config={config}
          eleves={eleves}
          onConfirm={confirmerAjout}
          onClose={() => setModalEleve(null)}
          terminologie={terminologie}
          langue={langue}
        />
      )}
    </div>
  )
}
// cache bust Mon  8 Jun 2026 15:10:03 CEST
// cache bust Mon  8 Jun 2026 15:25:45 CEST
