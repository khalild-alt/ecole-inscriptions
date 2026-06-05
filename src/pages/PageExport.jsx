// src/pages/PageExport.jsx
import * as XLSX from 'xlsx'
import { useApp } from '../store/appStore'
import { useToast } from '../components/Toast'

function getNiveauLabel(niveauId, reglesAge) {
  return reglesAge.find(r => r.niveauId === niveauId)?.label || niveauId
}

function getStatutLabel(statut) {
  if (statut === 'accepte') return 'Accepté'
  if (statut === 'liste_attente') return "Liste d'attente"
  return 'En attente'
}

function getChampsVisibles(config) {
  return config.champs.filter(c => c.type !== 'computed')
}

function getValeurEleve(eleve, champId) {
  return eleve[champId] || ''
}

function hasArabic(str) {
  return /[\u0600-\u06FF]/.test(str || '')
}

function TexteAuto({ children, style }) {
  const arab = hasArabic(String(children || ''))
  return (
    <span style={{
      fontFamily: arab ? "'Noto Sans Arabic', sans-serif" : 'inherit',
      direction: arab ? 'rtl' : 'ltr',
      display: 'inline-block',
      ...style
    }}>
      {children}
    </span>
  )
}

// ── Export Excel ────────────────────────────────────────────────────────────
function exporterExcel(config, eleves, allocation, nomEtab, anneeLabel) {
  const wb = XLSX.utils.book_new()
  const champsVisibles = getChampsVisibles(config)

  // Ligne d'en-tête établissement
  const ligneEtab = [`Établissement : ${nomEtab || ''}`, `Année : ${anneeLabel || ''}`]

  const headers = [...champsVisibles.map(c => c.label), 'Âge', 'Niveau', 'Statut']
  if (allocation) headers.push('Salle allouée')

  const rows = eleves.map(e => {
    const row = champsVisibles.map(c => getValeurEleve(e, c.id))
    row.push(e.age ?? '')
    row.push(getNiveauLabel(e.niveauId, config.reglesAge))
    row.push(getStatutLabel(e.statut))
    if (allocation) {
      const res = allocation.affectations[e.niveauId]
      row.push(res?.salle?.nom || '—')
    }
    return row
  })

  const ws1 = XLSX.utils.aoa_to_sheet([ligneEtab, [], headers, ...rows])
  ws1['!cols'] = headers.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Tous les élèves')

  const acceptes = eleves.filter(e => e.statut === 'accepte')
  if (acceptes.length > 0) {
    const hA = [...champsVisibles.map(c => c.label), 'Âge', 'Niveau']
    if (allocation) hA.push('Salle')
    const rA = acceptes.map(e => {
      const row = champsVisibles.map(c => getValeurEleve(e, c.id))
      row.push(e.age ?? '')
      row.push(getNiveauLabel(e.niveauId, config.reglesAge))
      if (allocation) { const res = allocation.affectations[e.niveauId]; row.push(res?.salle?.nom || '—') }
      return row
    })
    const ws2 = XLSX.utils.aoa_to_sheet([ligneEtab, [], hA, ...rA])
    ws2['!cols'] = hA.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws2, 'Élèves acceptés')
  }

  const attente = eleves.filter(e => e.statut === 'liste_attente')
  if (attente.length > 0) {
    const hB = [...champsVisibles.map(c => c.label), 'Âge', 'Niveau']
    const rB = attente.map(e => {
      const row = champsVisibles.map(c => getValeurEleve(e, c.id))
      row.push(e.age ?? '')
      row.push(getNiveauLabel(e.niveauId, config.reglesAge))
      return row
    })
    const ws3 = XLSX.utils.aoa_to_sheet([ligneEtab, [], hB, ...rB])
    ws3['!cols'] = hB.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws3, "Liste d'attente")
  }

  if (allocation) {
    const synth = [
      ligneEtab, [],
      ['Niveau', 'Salle', 'Capacité', 'Demandes', 'Acceptés', 'Places libres', "Liste d'attente", 'Taux remplissage'],
      ...config.reglesAge.map(r => {
        const res = allocation.affectations[r.niveauId]
        if (!res) return [r.label, '—', '', 0, 0, 0, 0, '']
        const att = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
        return [r.label, res.salle?.nom || '—', res.salle?.capacite || '', res.nbDemandes, res.acceptes, res.salle ? res.placesLibres : '', att, res.salle ? `${res.tauxRemplissage}%` : '—']
      })
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(synth)
    XLSX.utils.book_append_sheet(wb, ws4, 'Synthèse allocation')
  }

  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  const nomFichier = `inscriptions_${(nomEtab || '').replace(/\s+/g, '_')}_${anneeLabel || date}`
  XLSX.writeFile(wb, `${nomFichier}.xlsx`)
}

// ── Impression PDF via navigateur ───────────────────────────────────────────
function imprimerPDF(config, eleves, allocation, nomEtab, anneeLabel) {
  const champsVisibles = getChampsVisibles(config)
  const date = new Date().toLocaleDateString('fr-FR')
  const acceptes = eleves.filter(e => e.statut === 'accepte')
  const attente = eleves.filter(e => e.statut === 'liste_attente')

  const arabStyle = (str) => {
    const arab = hasArabic(String(str || ''))
    return arab ? `style="font-family:'Noto Sans Arabic',sans-serif;direction:rtl;text-align:right;"` : ''
  }

  const tableRows = (liste) => liste.map((e, idx) => `
    <tr>
      <td>${idx + 1}</td>
      ${champsVisibles.map(c => `<td ${arabStyle(e[c.id])}>${e[c.id] || '—'}</td>`).join('')}
      <td>${e.age ?? '—'}</td>
      <td ${arabStyle(getNiveauLabel(e.niveauId, config.reglesAge))}>${getNiveauLabel(e.niveauId, config.reglesAge)}</td>
      ${allocation ? `<td>${allocation.affectations[e.niveauId]?.salle?.nom || '—'}</td>` : ''}
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inscriptions — ${nomEtab} — ${anneeLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a2e; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #1a1a2e; margin-bottom: 16px; }
    .header-title { font-size: 16px; font-weight: bold; }
    .header-sub { font-size: 11px; color: #555; margin-top: 4px; }
    .etab { font-size: 13px; font-weight: 700; color: #c8401a; }
    .etab[dir="rtl"] { font-family: 'Noto Sans Arabic', sans-serif; }
    .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; padding: 6px 10px; background: #1a1a2e; color: white; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1a1a2e; color: white; padding: 6px 8px; text-align: left; font-size: 9px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
    tr:nth-child(even) td { background: #f7f6f2; }
    .badge-accepte { background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 10px; font-weight: 600; }
    .badge-attente { background: #fee2e2; color: #991b1b; padding: 2px 7px; border-radius: 10px; font-weight: 600; }
    .synth-table th { font-size: 9px; }
    @page { size: A4 landscape; margin: 1.5cm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">Gestion des Inscriptions Scolaires</div>
      <div class="etab" ${hasArabic(nomEtab) ? 'dir="rtl"' : ''}>${nomEtab || ''}</div>
      <div class="header-sub">Année scolaire : ${anneeLabel || ''} · Généré le ${date}</div>
    </div>
    <div style="text-align:right;">
      <div>${eleves.length} demandes · ${acceptes.length} acceptés · ${attente.length} en attente</div>
      ${allocation ? `<div style="margin-top:4px;">Mode : ${allocation.mode === 'B' ? 'Max élèves' : 'Max remplissage'}</div>` : ''}
    </div>
  </div>

  ${allocation ? `
  <div class="section-title">Synthèse de l'allocation</div>
  <table class="synth-table">
    <thead><tr>
      <th>Niveau</th><th>Salle</th><th>Capacité</th><th>Demandes</th>
      <th>Acceptés</th><th>Places libres</th><th>Liste attente</th><th>Remplissage</th>
    </tr></thead>
    <tbody>
      ${config.reglesAge.map(r => {
        const res = allocation.affectations[r.niveauId]
        if (!res) return ''
        const att = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
        const arabLabel = hasArabic(r.label)
        return `<tr>
          <td ${arabLabel ? `style="font-family:'Noto Sans Arabic',sans-serif;direction:rtl;"` : ''}>${r.label}</td>
          <td>${res.salle?.nom || '—'}</td>
          <td>${res.salle?.capacite || '—'}</td>
          <td>${res.nbDemandes}</td>
          <td><strong>${res.acceptes}</strong></td>
          <td>${res.salle ? res.placesLibres : '—'}</td>
          <td>${att}</td>
          <td>${res.salle ? res.tauxRemplissage + '%' : '—'}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  ${acceptes.length > 0 ? `
  <div class="section-title">Élèves acceptés (${acceptes.length})</div>
  <table>
    <thead><tr>
      <th>#</th>
      ${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
      <th>Âge</th><th>Niveau</th>${allocation ? '<th>Salle</th>' : ''}
    </tr></thead>
    <tbody>${tableRows(acceptes)}</tbody>
  </table>
  ` : ''}

  ${attente.length > 0 ? `
  <div class="section-title">Liste d'attente (${attente.length})</div>
  <table>
    <thead><tr>
      <th>#</th>
      ${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
      <th>Âge</th><th>Niveau</th>
    </tr></thead>
    <tbody>${tableRows(attente)}</tbody>
  </table>
  ` : ''}

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ── Page principale Export ──────────────────────────────────────────────────
export default function PageExport({ nomEtab, anneeLabel }) {
  const { config, eleves, allocation } = useApp()
  const toast = useToast()

  function handleExportExcel() {
    if (eleves.length === 0) { toast('Aucune donnée à exporter', 'error'); return }
    exporterExcel(config, eleves, allocation, nomEtab, anneeLabel)
    toast('Export Excel généré', 'success')
  }

  function handleExportPDF() {
    if (eleves.length === 0) { toast('Aucune donnée à exporter', 'error'); return }
    imprimerPDF(config, eleves, allocation, nomEtab, anneeLabel)
  }

  const nbAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const nbAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const champsVisibles = config.champs.filter(c => c.type !== 'computed')

  return (
    <div className="page">
      <h2 className="page-title">Export</h2>

      {/* Établissement affiché en permanence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 16px', background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', borderLeft: '4px solid var(--accent)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Établissement :</span>
        <span style={{
          fontSize: '1rem', fontWeight: 700, color: 'var(--accent)',
          fontFamily: hasArabic(nomEtab) ? "'Noto Sans Arabic', sans-serif" : 'inherit',
          direction: hasArabic(nomEtab) ? 'rtl' : 'ltr',
        }}>
          {nomEtab}
        </span>
        <span style={{ color: 'var(--paper3)' }}>·</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--ink-light)', fontWeight: 600 }}>{anneeLabel}</span>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{eleves.length}</div><div className="stat-label">Total inscriptions</div></div>
        <div className="stat-card success"><div className="stat-value">{nbAcceptes}</div><div className="stat-label">Acceptés</div></div>
        <div className="stat-card warning"><div className="stat-value">{nbAttente}</div><div className="stat-label">Liste d'attente</div></div>
      </div>

      {!allocation && (
        <div className="alert alert-warning">
          Aucune allocation calculée. L'export ne contiendra pas les résultats d'affectation.
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 8 }}>Export Excel</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>
            Fichier .xlsx avec les feuilles : tous les élèves, acceptés, liste d'attente{allocation ? ', synthèse' : ''}.
            <br/>Champs : {champsVisibles.map(c => c.label).join(', ')}.
            <br/>Inclut le nom de l'établissement et l'année.
          </div>
          <button className="btn btn-success btn-lg" onClick={handleExportExcel} disabled={eleves.length === 0} style={{ width: '100%', justifyContent: 'center' }}>
            📥 Export Excel
          </button>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📄</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 8 }}>Export PDF</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>
            Ouvre une fenêtre d'impression avec le document complet. Supporte le texte arabe.
            <br/>Inclut l'établissement, l'année{allocation ? ', la synthèse d\'allocation' : ''}, les listes.
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleExportPDF} disabled={eleves.length === 0} style={{ width: '100%', justifyContent: 'center' }}>
            📥 Export PDF
          </button>
        </div>
      </div>

      {eleves.length > 0 && (
        <div className="card">
          <div className="card-title">👁 Aperçu par niveau</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Niveau</th><th>Demandes</th><th>Acceptés</th><th>Liste d'attente</th>
                  {allocation && <th>Salle</th>}{allocation && <th>Places libres</th>}
                </tr>
              </thead>
              <tbody>
                {config.reglesAge.map(r => {
                  const total = eleves.filter(e => e.niveauId === r.niveauId).length
                  const acc = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte').length
                  const att = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
                  const res = allocation?.affectations?.[r.niveauId]
                  return (
                    <tr key={r.niveauId}>
                      <td>
                        <TexteAuto>{r.label}</TexteAuto>
                      </td>
                      <td>{total}</td>
                      <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{acc}</span></td>
                      <td><span style={{ color: att > 0 ? 'var(--danger)' : 'var(--ink-muted)', fontWeight: att > 0 ? 700 : 400 }}>{att}</span></td>
                      {allocation && <td>{res?.salle?.nom || '—'}</td>}
                      {allocation && <td>{res?.salle ? res.placesLibres : '—'}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
