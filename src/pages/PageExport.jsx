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


export default function PageExport({ nomEtab, anneeLabel }) {
  const { config, eleves, allocation } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const te = t.export



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
