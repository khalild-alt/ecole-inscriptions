// src/pages/PageExport.jsx
import { useApp } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'

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
    <span style={{ fontFamily: arab ? "'Noto Sans Arabic', sans-serif" : 'inherit', direction: arab ? 'rtl' : 'ltr', display: 'inline-block', ...style }}>
      {children}
    </span>
  )
}

function exporterExcel(config, eleves, allocation, nomEtab, anneeLabel, te) {
  const wb = XLSX.utils.book_new()
  const champsVisibles = getChampsVisibles(config)
  const ligneEtab = [`${te.etablissement} : ${nomEtab || ''}`, `${te.annee} : ${anneeLabel || ''}`]
  const headers = [...champsVisibles.map(c => c.label), te.col_age, te.col_niveau, te.col_statut || 'Statut']
  if (allocation) headers.push(te.col_salle)

  const getStatut = (statut) => {
    if (statut === 'accepte') return te.acceptes_titre
    if (statut === 'liste_attente') return te.attente_titre
    return 'En attente'
  }

  const rows = eleves.map(e => {
    const row = champsVisibles.map(c => getValeurEleve(e, c.id))
    row.push(e.age ?? '')
    row.push(config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || e.niveauId)
    row.push(getStatut(e.statut))
    if (allocation) { const res = allocation.affectations[e.niveauId]; row.push(res?.salle?.nom || '—') }
    return row
  })

  const ws1 = XLSX.utils.aoa_to_sheet([ligneEtab, [], headers, ...rows])
  ws1['!cols'] = headers.map(() => ({ wch: 20 }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Tous'.slice(0, 31))

  const acceptes = eleves.filter(e => e.statut === 'accepte')
  if (acceptes.length > 0) {
    const hA = [...champsVisibles.map(c => c.label), te.col_age, te.col_niveau]
    if (allocation) hA.push(te.col_salle)
    const rA = acceptes.map(e => {
      const row = champsVisibles.map(c => getValeurEleve(e, c.id))
      row.push(e.age ?? '')
      row.push(config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || e.niveauId)
      if (allocation) { const res = allocation.affectations[e.niveauId]; row.push(res?.salle?.nom || '—') }
      return row
    })
    const ws2 = XLSX.utils.aoa_to_sheet([ligneEtab, [], hA, ...rA])
    ws2['!cols'] = hA.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws2, String(te.acceptes_titre || 'Acceptes').slice(0, 31))
  }

  const attente = eleves.filter(e => e.statut === 'liste_attente')
  if (attente.length > 0) {
    const hB = [...champsVisibles.map(c => c.label), te.col_age, te.col_niveau]
    const rB = attente.map(e => {
      const row = champsVisibles.map(c => getValeurEleve(e, c.id))
      row.push(e.age ?? '')
      row.push(config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || e.niveauId)
      return row
    })
    const ws3 = XLSX.utils.aoa_to_sheet([ligneEtab, [], hB, ...rB])
    ws3['!cols'] = hB.map(() => ({ wch: 20 }))
    XLSX.utils.book_append_sheet(wb, ws3, String(te.attente_titre || 'Attente').slice(0, 31))
  }

  if (allocation) {
    const synth = [
      ligneEtab, [],
      [te.col_niveau, te.col_salle, te.col_capacite || 'Cap.', te.col_demandes, te.col_acceptes, te.col_libres, te.col_attente, te.col_taux],
      ...config.reglesAge.map(r => {
        const res = allocation.affectations[r.niveauId]
        if (!res) return [r.label, '—', '', 0, 0, 0, 0, '']
        const att = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
        return [r.label, res.salle?.nom || '—', res.salle?.capacite || '', res.nbDemandes, res.acceptes, res.salle ? res.placesLibres : '', att, res.salle ? `${res.tauxRemplissage}%` : '—']
      })
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(synth)
    XLSX.utils.book_append_sheet(wb, ws4, String(te.synthese || 'Synthese').slice(0, 31))
  }

  const date = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  XLSX.writeFile(wb, `inscriptions_${(nomEtab || '').replace(/\s+/g, '_')}_${anneeLabel || date}.xlsx`)
}

function imprimerPDF(config, eleves, allocation, nomEtab, anneeLabel, te, langue) {
  const champsVisibles = getChampsVisibles(config)
  const date = new Date().toLocaleDateString('fr-FR')
  const acceptes = eleves.filter(e => e.statut === 'accepte')
  const attente = eleves.filter(e => e.statut === 'liste_attente')
  const isRtl = langue === 'ar'

  const arabStyle = (str) => hasArabic(String(str || '')) ? `style="font-family:'Noto Sans Arabic',sans-serif;direction:rtl;text-align:right;"` : ''

  const tableRows = (liste) => liste.map((e, idx) => `
    <tr>
      <td>${idx + 1}</td>
      ${champsVisibles.map(c => `<td ${arabStyle(e[c.id])}>${e[c.id] || '—'}</td>`).join('')}
      <td>${e.age ?? '—'}</td>
      <td ${arabStyle(config.reglesAge.find(r => r.niveauId === e.niveauId)?.label)}>${config.reglesAge.find(r => r.niveauId === e.niveauId)?.label || '—'}</td>
      ${allocation ? `<td>${allocation.affectations[e.niveauId]?.salle?.nom || '—'}</td>` : ''}
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${nomEtab} — ${anneeLabel}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${isRtl ? "'Noto Sans Arabic'," : ''}Arial, sans-serif; font-size: 10px; color: #1a1a2e; padding: 20px; direction: ${isRtl ? 'rtl' : 'ltr'}; }
    .header { display: flex; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #3b4a2f; margin-bottom: 16px; }
    .header-title { font-size: 16px; font-weight: bold; color: #3b4a2f; }
    .etab { font-size: 13px; font-weight: 700; color: #c8401a; font-family: 'Noto Sans Arabic', Arial; }
    .section-title { font-size: 13px; font-weight: bold; margin: 20px 0 8px; padding: 6px 10px; background: #3b4a2f; color: white; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #3b4a2f; color: white; padding: 6px 8px; text-align: ${isRtl ? 'right' : 'left'}; font-size: 9px; }
    td { padding: 5px 8px; border-bottom: 1px solid #eee; }
    tr:nth-child(even) td { background: #f7f6f2; }
    @page { size: A4 landscape; margin: 1.5cm; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">${te.titre}</div>
      <div class="etab">${nomEtab || ''}</div>
      <div style="font-size:9px;color:#666;margin-top:4px;">${te.annee} : ${anneeLabel || ''} · ${te.genere_le} ${date}</div>
    </div>
    <div style="text-align:${isRtl ? 'left' : 'right'}">
      <div>${eleves.length} ${te.col_demandes} · ${acceptes.length} ${te.acceptes_titre} · ${attente.length} ${te.attente_titre}</div>
      ${allocation ? `<div>${te.mode_label} : ${allocation.mode === 'B' ? te.mode_b : te.mode_a}</div>` : ''}
    </div>
  </div>

  ${allocation ? `
  <div class="section-title">${te.synthese}</div>
  <table>
    <thead><tr>
      <th>${te.col_niveau}</th><th>${te.col_salle}</th><th>${te.col_demandes}</th>
      <th>${te.col_acceptes}</th><th>${te.col_libres}</th><th>${te.col_attente}</th><th>${te.col_taux}</th>
    </tr></thead>
    <tbody>
      ${config.reglesAge.map(r => {
        const res = allocation.affectations[r.niveauId]
        if (!res) return ''
        const att = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
        return `<tr>
          <td ${arabStyle(r.label)}>${r.label}</td>
          <td>${res.salle?.nom || '—'}</td>
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
  <div class="section-title">${te.acceptes_titre} (${acceptes.length})</div>
  <table>
    <thead><tr>
      <th>#</th>
      ${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
      <th>${te.col_age}</th><th>${te.col_niveau}</th>${allocation ? `<th>${te.col_salle}</th>` : ''}
    </tr></thead>
    <tbody>${tableRows(acceptes)}</tbody>
  </table>
  ` : ''}

  ${attente.length > 0 ? `
  <div class="section-title">${te.attente_titre} (${attente.length})</div>
  <table>
    <thead><tr>
      <th>#</th>
      ${champsVisibles.map(c => `<th ${arabStyle(c.label)}>${c.label}</th>`).join('')}
      <th>${te.col_age}</th><th>${te.col_niveau}</th>
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

export default function PageExport({ nomEtab, anneeLabel }) {
  const { config, eleves, allocation } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const te = t.export

  function handleExportPDF() {
    if (eleves.length === 0) { toast(te.aucune_donnee, 'error'); return }
    imprimerPDF(config, eleves, allocation, nomEtab, anneeLabel, te, langue)
  }

  const nbAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const nbAttente = eleves.filter(e => e.statut === 'liste_attente').length

  return (
    <div className="page">
      <h2 className="page-title">{te.titre}</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '10px 16px', background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', borderLeft: '4px solid var(--accent)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{te.etablissement} :</span>
        <TexteAuto style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>{nomEtab}</TexteAuto>
        <span style={{ color: 'var(--paper3)' }}>·</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--ink-light)', fontWeight: 600 }}>{anneeLabel}</span>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{eleves.length}</div><div className="stat-label">{te.col_demandes}</div></div>
        <div className="stat-card success"><div className="stat-value">{nbAcceptes}</div><div className="stat-label">{te.acceptes_titre}</div></div>
        <div className="stat-card warning"><div className="stat-value">{nbAttente}</div><div className="stat-label">{te.attente_titre}</div></div>
      </div>

      {!allocation && <div className="alert alert-warning">{te.sans_allocation}</div>}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

        <div className="card" style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📄</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 8 }}>{te.titre_pdf}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>{te.desc_pdf}</div>
          <button className="btn btn-primary btn-lg" onClick={handleExportPDF} disabled={eleves.length === 0} style={{ width: '100%', justifyContent: 'center' }}>
            {te.btn_pdf}
          </button>
        </div>
      </div>

      {eleves.length > 0 && (
        <div className="card">
          <div className="card-title">👁 {te.apercu}</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{te.col_niveau}</th><th>{te.col_demandes}</th><th>{te.col_acceptes}</th><th>{te.col_attente}</th>
                  {allocation && <th>{te.col_salle}</th>}{allocation && <th>{te.col_libres}</th>}
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
                      <td><TexteAuto>{r.label}</TexteAuto></td>
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
