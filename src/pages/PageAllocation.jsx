// src/pages/PageAllocation.jsx
import { useApp } from '../store/appStore'
import { useToast } from '../components/Toast'

function getNiveauClass(niveauId) {
  const map = { annee1: 'niveau-annee1', annee2: 'niveau-annee2', annee3: 'niveau-annee3', annee4: 'niveau-annee4' }
  return map[niveauId] || 'niveau-inconnu'
}

function CarteNiveau({ niveauId, label, res, eleves, onForcer, lectureSeule }) {
  const taux = parseFloat(res.tauxRemplissage)
  const fillClass = taux >= 90 ? '' : taux >= 60 ? 'warning' : 'danger'
  const elevesNiveau = eleves.filter(e => e.niveauId === niveauId)
    .sort((a, b) => new Date(a.dateInscription) - new Date(b.dateInscription))

  return (
    <div className="alloc-card">
      <div className={`alloc-card-header${!res.salle ? ' no-salle' : ''}`}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', direction: 'auto' }}>{label}</div>
          {res.salle
            ? <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 2 }}>→ {res.salle.nom} (capacité : {res.salle.capacite})</div>
            : <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: 2 }}>⚠ Aucune salle allouée</div>
          }
        </div>
        {res.salle && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{taux}%</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>remplissage</div>
          </div>
        )}
      </div>
      <div className="alloc-card-body">
        {res.salle && (
          <>
            <div className="alloc-progress-bar">
              <div className={`alloc-progress-fill ${fillClass}`} style={{ width: `${Math.min(100, taux)}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 10 }}>
              <span><strong>{res.acceptes}</strong> accepté{res.acceptes > 1 ? 's' : ''}</span>
              <span style={{ color: res.placesLibres > 0 ? 'var(--info)' : 'var(--success)' }}>
                <strong>{res.placesLibres}</strong> place{res.placesLibres > 1 ? 's' : ''} libre{res.placesLibres > 1 ? 's' : ''}
              </span>
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: '0.85rem' }}>Demandes : <strong>{res.nbDemandes}</strong></span>
          {res.refusesSalle > 0 && <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Salle trop petite : <strong>{res.refusesSalle}</strong></span>}
          {!res.salle && res.nbDemandes > 0 && <span className="badge badge-liste">{res.nbDemandes} en liste d'attente</span>}
        </div>
        {elevesNiveau.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 600 }}>
              Voir les {elevesNiveau.length} élèves ▾
            </summary>
            <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8 }}>
              {elevesNiveau.map((e, idx) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--paper2)', fontSize: '0.85rem' }}>
                  <span>
                    <span style={{ color: 'var(--ink-muted)', marginRight: 6 }}>#{idx + 1}</span>
                    {e.prenom} {e.nom}
                    {e.force && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>★ Forcé</span>}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {e.statut === 'accepte' ? <span className="badge badge-accepte">✓ Accepté</span> : <span className="badge badge-liste">Attente</span>}
                    {!lectureSeule && (
                      <button className={`btn btn-sm ${e.force ? 'btn-warning' : 'btn-ghost'}`}
                        onClick={() => onForcer(e.id, !e.force)}
                        title={e.force ? 'Annuler le forçage' : 'Forcer l\'acceptation'}>
                        {e.force ? '★' : '☆'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

export default function PageAllocation({ lectureSeule, nomEtab, anneeLabel }) {
  const { config, eleves, allocation, modeAllocation, setModeAllocation, lancerOptimisation, forcerEleve } = useApp()
  const toast = useToast()

  function handleOptimiser() {
    if (eleves.length === 0) { toast('Aucune inscription à traiter', 'error'); return }
    lancerOptimisation(modeAllocation)
    toast('Calcul d\'allocation lancé…', 'info')
  }

  function handleForcer(id, forcer) {
    forcerEleve(id, forcer)
    if (allocation) {
      lancerOptimisation(modeAllocation)
      toast(forcer ? 'Élève forcé — recalcul effectué' : 'Forçage annulé — recalcul effectué', 'info')
    }
  }

  const totalEleves = eleves.length
  const totalAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const totalAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const totalCapacite = allocation ? Object.values(allocation.affectations).reduce((s, r) => s + (r.salle?.capacite || 0), 0) : 0
  const tauxGlobal = totalCapacite > 0 ? ((totalAcceptes / totalCapacite) * 100).toFixed(1) : 0

  return (
    <div className="page">
      <h2 className="page-title">Allocation des salles</h2>
      <p className="page-subtitle">Lancez le calcul pour affecter les salles aux niveaux de façon optimale.</p>

      {!lectureSeule && (
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0}>
              ▶ Calculer l'allocation
            </button>
            <div style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
              Mode actif : <strong>{modeAllocation === 'B' ? 'B — Maximiser les élèves acceptés' : 'A — Maximiser le remplissage'}</strong>
              <span style={{ marginLeft: 8, fontSize: '0.78rem' }}>(modifiable dans Config. Salles)</span>
            </div>
          </div>
        </div>
      )}

      {allocation ? (
        <>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-value">{totalEleves}</div><div className="stat-label">Demandes totales</div></div>
            <div className="stat-card success"><div className="stat-value">{totalAcceptes}</div><div className="stat-label">Élèves acceptés</div></div>
            <div className="stat-card warning"><div className="stat-value">{totalAttente}</div><div className="stat-label">Liste d'attente</div></div>
            <div className="stat-card info"><div className="stat-value">{tauxGlobal}%</div><div className="stat-label">Taux de remplissage</div></div>
            <div className="stat-card neutral"><div className="stat-value">{totalCapacite}</div><div className="stat-label">Capacité allouée</div></div>
          </div>

          <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="badge badge-info">Mode {allocation.mode} — {allocation.mode === 'B' ? 'Max élèves' : 'Max remplissage'}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Calculé le {new Date(allocation.date).toLocaleString('fr-FR')}</span>
          </div>

          <div className="alloc-grid">
            {config.reglesAge.map(r => {
              const res = allocation.affectations[r.niveauId]
              if (!res) return null
              return <CarteNiveau key={r.niveauId} niveauId={r.niveauId} label={r.label} res={res} eleves={eleves} onForcer={handleForcer} lectureSeule={lectureSeule} />
            })}
          </div>

          {/* Salles non utilisées */}
          {(() => {
            const used = new Set(Object.values(allocation.affectations).filter(r => r.salle).map(r => r.salle.id))
            const libres = config.salles.filter(s => !used.has(s.id))
            if (!libres.length) return null
            return (
              <div className="card">
                <div className="card-title">🚪 Salles non utilisées</div>
                <div className="chips">{libres.map(s => <span key={s.id} className="chip">{s.nom} ({s.capacite} places)</span>)}</div>
              </div>
            )
          })()}

          {/* Tableau de synthèse */}
          <div className="card">
            <div className="card-title">📊 Tableau de synthèse</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Niveau</th><th>Salle</th><th>Capacité</th><th>Demandes</th><th>Acceptés</th><th>Places libres</th><th>Liste attente</th><th>Remplissage</th></tr>
                </thead>
                <tbody>
                  {config.reglesAge.map(r => {
                    const res = allocation.affectations[r.niveauId]
                    if (!res) return null
                    const enAttente = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente').length
                    return (
                      <tr key={r.niveauId}>
                        <td><span className={`niveau-tag ${getNiveauClass(r.niveauId)}`} style={{ direction: 'auto' }}>{r.label}</span></td>
                        <td><strong>{res.salle ? res.salle.nom : '—'}</strong></td>
                        <td>{res.salle ? res.salle.capacite : '—'}</td>
                        <td>{res.nbDemandes}</td>
                        <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{res.acceptes}</span></td>
                        <td><span style={{ color: res.placesLibres > 0 ? 'var(--info)' : 'var(--ink-muted)' }}>{res.salle ? res.placesLibres : '—'}</span></td>
                        <td><span style={{ color: enAttente > 0 ? 'var(--danger)' : 'var(--ink-muted)', fontWeight: enAttente > 0 ? 700 : 400 }}>{enAttente}</span></td>
                        <td>{res.salle ? <span style={{ fontWeight: 700 }}>{res.tauxRemplissage}%</span> : '—'}</td>
                      </tr>
                    )
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
            {eleves.length === 0 ? 'Commencez par saisir des inscriptions, puis lancez le calcul.' : `${eleves.length} inscription(s) en attente. Cliquez sur "Calculer l'allocation".`}
          </div>
        </div>
      )}
    </div>
  )
}
