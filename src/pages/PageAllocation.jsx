// src/pages/PageAllocation.jsx
import { useState } from 'react'
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'
import { supabase } from '../lib/supabase'

function getNiveauClass(niveauId) {
  const map = { annee1: 'niveau-annee1', annee2: 'niveau-annee2', annee3: 'niveau-annee3', annee4: 'niveau-annee4' }
  return map[niveauId] || 'niveau-inconnu'
}

function nomSalle(salle) {
  if (!salle) return '—'
  return salle.nomComplet ? `${salle.nom} — ${salle.nomComplet}` : salle.nom
}

// Modal pour déplacer un élève
function ModalDeplacer({ eleve, niveauActuel, allocation, config, eleves, onConfirm, onClose, langue, terminologie }) {
  const [niveauCible, setNiveauCible] = useState('')
  const [classeCible, setClasseCible] = useState('')

  // Niveaux compatibles avec l'âge de l'élève
  const niveauxCompatibles = config.reglesAge.filter(r => eleve.age >= r.ageMin && eleve.age <= r.ageMax)

  const classesDisponibles = niveauCible && allocation?.affectations?.[niveauCible]?.classes
    ? allocation.affectations[niveauCible].classes.filter(c => {
        // Vérifier qu'il reste de la place
        const nbActuels = eleves.filter(e => c.elevesIds?.includes(e.id)).length
        return nbActuels < c.salle.capacite
      })
    : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16 }}>
          Déplacer : {eleve.prenom} {eleve.nom}
        </h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: 20 }}>
          Âge : {eleve.age} ans · Niveau actuel : {config.reglesAge.find(r => r.niveauId === niveauActuel)?.label}
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
            <label className="form-label">{terminologie?.groupe || 'Groupe'} de destination</label>
            {classesDisponibles.length === 0 ? (
              <div className="alert alert-warning">Aucun groupe disponible avec de la place dans ce niveau.</div>
            ) : (
              <select className="form-input" value={classeCible} onChange={e => setClasseCible(e.target.value)}>
                <option value="">— Choisir —</option>
                {classesDisponibles.map(c => {
                  const nbActuels = eleves.filter(e => c.elevesIds?.includes(e.id)).length
                  return (
                    <option key={c.classeId} value={c.classeId}>
                      {terminologie?.groupe || 'Groupe'} {c.classeNum} — {nomSalle(c.salle)} ({nbActuels}/{c.salle.capacite})
                    </option>
                  )
                })}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" disabled={!classeCible}
            onClick={() => onConfirm(niveauCible, classeCible)}>
            ✓ Déplacer
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function CarteGroupe({ classe, niveauId, niveauLabel, eleves, config, terminologie, fige, onFiger, onDeplacer, lectureSeule, langue }) {
  const taux = parseFloat(classe.tauxRemplissage)
  const terme = terminologie?.groupe || 'Groupe'
  const nomGroupe = `${niveauLabel} — ${terme} ${classe.classeNum} — ${nomSalle(classe.salle)}`
  const elevesGroupe = eleves.filter(e => classe.elevesIds && classe.elevesIds.includes(e.id))
    .sort((a, b) => new Date(a.dateInscription) - new Date(b.dateInscription))

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius)', marginBottom: 10, overflow: 'hidden',
      border: fige ? '2px solid var(--accent)' : '1.5px solid var(--paper3)',
    }}>
      <div style={{
        background: fige ? 'var(--accent)' : taux === 100 ? '#2d7a4f' : taux >= 80 ? '#1a5fa0' : '#b07d1a',
        color: 'white', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', direction: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {fige && <span title="Groupe figé">🔒</span>}
            {nomGroupe}
          </div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
            {classe.nbAcceptes}/{classe.salle?.capacite} élèves · {taux}%
            {classe.placesLibres > 0 && ` · ${classe.placesLibres} place(s) libre(s)`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!lectureSeule && (
            <button
              className={`btn btn-sm ${fige ? 'btn-warning' : 'btn-ghost'}`}
              style={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}
              onClick={() => onFiger(classe.classeId, !fige)}
              title={fige ? 'Libérer ce groupe' : 'Figer ce groupe (ne sera pas modifié au prochain calcul)'}
            >
              {fige ? '🔓 Libérer' : '🔒 Figer'}
            </button>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{taux}%</div>
          </div>
        </div>
      </div>

      <div style={{ height: 6, background: 'var(--paper2)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, taux)}%`, background: fige ? 'var(--accent)' : taux === 100 ? 'var(--success)' : taux >= 80 ? 'var(--info)' : 'var(--warning)' }} />
      </div>

      {elevesGroupe.length > 0 && (
        <div style={{ padding: '10px 16px' }}>
          <details open={elevesGroupe.length <= 8}>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 6 }}>
              👥 {elevesGroupe.length} élève{elevesGroupe.length > 1 ? 's' : ''} ▾
            </summary>
            <div style={{ overflowX: 'auto', maxHeight: 250, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th style={{ padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'left' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.75rem', direction: 'auto', textAlign: 'left' }}>{c.label}</th>
                    ))}
                    <th style={{ padding: '4px 8px', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'left' }}>Âge</th>
                    {!lectureSeule && <th style={{ width: 80 }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {elevesGroupe.map((e, idx) => (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                      <td style={{ padding: '5px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                      {config.champs.filter(c => c.type !== 'computed').map(c => (
                        <td key={c.id} style={{ padding: '5px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                      ))}
                      <td style={{ padding: '5px 8px' }}><strong>{e.age}</strong> ans</td>
                      {!lectureSeule && (
                        <td style={{ padding: '5px 8px' }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}
                            onClick={() => onDeplacer(e, niveauId)}>
                            ↔ Déplacer
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function CarteNiveau({ niveauId, label, res, eleves, config, terminologie, groupesFiges, onFiger, onDeplacer, lectureSeule, langue }) {
  const enAttente = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '2px solid var(--paper2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`niveau-tag ${getNiveauClass(niveauId)}`} style={{ fontSize: '0.95rem', padding: '4px 14px', direction: 'auto' }}>{label}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
            {res.classes.length} {terminologie?.groupe || 'groupe'}{res.classes.length > 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span>{res.nbDemandes} demandes</span>
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓ {res.nbAcceptes} acceptés</span>
          {res.nbAttente > 0 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⏳ {res.nbAttente} en attente</span>}
        </div>
      </div>

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
          onDeplacer={onDeplacer}
          lectureSeule={lectureSeule}
          langue={langue}
        />
      ))}

      {enAttente.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
            ⏳ Liste d'attente : {enAttente.length} élève{enAttente.length > 1 ? 's' : ''} ▾
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
                </tr>
              </thead>
              <tbody>
                {enAttente.map((e, idx) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <td key={c.id} style={{ padding: '4px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                    ))}
                    <td style={{ padding: '4px 8px' }}>{e.age} ans</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}

export default function PageAllocation({ lectureSeule, nomEtab, anneeLabel }) {
  const { config, eleves, allocation, setAllocation, lancerOptimisation, annee } = useApp()
  const { langue } = useI18n()
  const toast = useToast()
  const terminologie = config.terminologie || DEFAULT_CONFIG.terminologie || { groupe: 'Groupe', annee: 'Année' }

  // Charger les groupes figés depuis l'allocation sauvegardée
  const [groupesFiges, setGroupesFiges] = useState(() => {
    if (allocation?.groupesFiges) return new Set(allocation.groupesFiges)
    return new Set()
  })
  const [eleveADeplacer, setEleveADeplacer] = useState(null)
  const [niveauEleveADeplacer, setNiveauEleveADeplacer] = useState(null)

  function handleOptimiser() {
    if (eleves.length === 0) { toast('Aucune inscription à traiter', 'error'); return }
    lancerOptimisation()
    toast('Calcul lancé…', 'info')
  }

  async function handleFiger(classeId, figer) {
    const nouveauxFiges = new Set(groupesFiges)
    if (figer) nouveauxFiges.add(classeId)
    else nouveauxFiges.delete(classeId)
    setGroupesFiges(nouveauxFiges)
    // Sauvegarder en base
    if (annee?.id) {
      await supabase.from('allocations').upsert({
        annee_id: annee.id,
        affectations: allocation.affectations,
        groupes_figes: Array.from(nouveauxFiges),
        mode: allocation.mode || 'multi',
        calculated_at: allocation.date || new Date().toISOString()
      }, { onConflict: 'annee_id' })
      setAllocation(prev => ({ ...prev, groupesFiges: Array.from(nouveauxFiges) }))
    }
    toast(figer ? '🔒 Groupe figé et sauvegardé' : '🔓 Groupe libéré', 'info')
  }

  function handleDeplacer(eleve, niveauId) {
    setEleveADeplacer(eleve)
    setNiveauEleveADeplacer(niveauId)
  }

  async function confirmerDeplacement(niveauCible, classeIdCible) {
    if (!allocation || !eleveADeplacer) return
    const aff = JSON.parse(JSON.stringify(allocation.affectations))

    // Retirer l'élève de son groupe actuel
    for (const [nId, res] of Object.entries(aff)) {
      for (const cls of res.classes) {
        if (cls.elevesIds) cls.elevesIds = cls.elevesIds.filter(id => id !== eleveADeplacer.id)
      }
    }

    // Ajouter l'élève dans le groupe cible
    const clsCible = aff[niveauCible]?.classes?.find(c => c.classeId === classeIdCible)
    if (clsCible) {
      if (!clsCible.elevesIds) clsCible.elevesIds = []
      clsCible.elevesIds.push(eleveADeplacer.id)
      clsCible.nbAcceptes = clsCible.elevesIds.length
      clsCible.placesLibres = clsCible.salle.capacite - clsCible.nbAcceptes
      clsCible.tauxRemplissage = ((clsCible.nbAcceptes / clsCible.salle.capacite) * 100).toFixed(1)
    }

    // Mettre à jour le niveau de l'élève si nécessaire
    if (niveauCible !== niveauEleveADeplacer) {
      await supabase.from('eleves').update({ niveau_id: niveauCible, statut: 'accepte' }).eq('id', eleveADeplacer.id)
    }

    // Sauvegarder l'allocation modifiée
    await supabase.from('allocations').upsert({
      annee_id: annee.id, affectations: aff, mode: 'multi', calculated_at: new Date().toISOString()
    }, { onConflict: 'annee_id' })

    setAllocation({ affectations: aff, mode: 'multi', date: new Date().toISOString() })
    setEleveADeplacer(null)
    setNiveauEleveADeplacer(null)
    toast(`${eleveADeplacer.prenom} ${eleveADeplacer.nom} déplacé(e)`, 'success')
  }

  // Calculs stats — défensif pour les deux formats d'affectations
  const totalEleves = eleves.length
  const totalAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const totalAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const totalCapacite = allocation
    ? Object.values(allocation.affectations).reduce((s, r) => {
        if (r.placesTotales) return s + r.placesTotales
        if (r.classes) return s + r.classes.reduce((sc, c) => sc + (c.salle?.capacite || 0), 0)
        return s + (r.salle?.capacite || 0)
      }, 0)
    : 0
  const tauxGlobal = totalCapacite > 0 ? ((totalAcceptes / totalCapacite) * 100).toFixed(1) : 0

  // Vérifier si l'allocation a le format multi-classes

  return (
    <div className="page">
      <h2 className="page-title">Allocation des salles</h2>
      <p className="page-subtitle">
        {groupesFiges.size > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>🔒 {groupesFiges.size} groupe(s) figé(s) — </span>}
        Toutes les salles utilisées. Chaque {terminologie.groupe.toLowerCase()} affiché avec sa salle et la liste complète des élèves.
      </p>

      {!lectureSeule && (
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0}>
              ▶ Calculer l'allocation
            </button>
            {groupesFiges.size > 0 && (
              <div className="alert alert-info" style={{ margin: 0, flex: 1 }}>
                ⚠️ {groupesFiges.size} groupe(s) figé(s) seront conservés tels quels lors du prochain calcul.
              </div>
            )}
          </div>
        </div>
      )}

      {allocation && Object.keys(allocation.affectations).length > 0 ? (
        <>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-value">{totalEleves}</div><div className="stat-label">Demandes totales</div></div>
            <div className="stat-card success"><div className="stat-value">{totalAcceptes}</div><div className="stat-label">Élèves acceptés</div></div>
            <div className="stat-card warning"><div className="stat-value">{totalAttente}</div><div className="stat-label">Liste d'attente</div></div>
            <div className="stat-card info"><div className="stat-value">{tauxGlobal}%</div><div className="stat-label">Remplissage global</div></div>
            <div className="stat-card neutral"><div className="stat-value">{totalCapacite}</div><div className="stat-label">Capacité totale</div></div>
          </div>

          <div style={{ marginBottom: 16, fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
            Calculé le {new Date(allocation.date).toLocaleString('fr-FR')}
          </div>

          {config.reglesAge.map(r => {
            const resRaw = allocation.affectations[r.niveauId]
            if (!resRaw) return null
            // Normaliser vers le format multi-classes
            const res = { ...resRaw }
            if (!res.classes) {
              const elevesAcceptes = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'accepte')
              const elevesAttente = eleves.filter(e => e.niveauId === r.niveauId && e.statut === 'liste_attente')
              res.classes = res.salle ? [{
                classeId: r.niveauId + '_c1', classeNum: 1,
                salle: res.salle,
                nbAcceptes: elevesAcceptes.length,
                placesLibres: Math.max(0, res.salle.capacite - elevesAcceptes.length),
                tauxRemplissage: res.salle.capacite > 0 ? ((elevesAcceptes.length / res.salle.capacite) * 100).toFixed(1) : '0',
                elevesIds: elevesAcceptes.map(e => e.id),
              }] : []
              res.nbDemandes = elevesAcceptes.length + elevesAttente.length
              res.nbAcceptes = elevesAcceptes.length
              res.nbAttente = elevesAttente.length
            }
            return (
              <CarteNiveau key={r.niveauId} niveauId={r.niveauId} label={r.label} res={res}
                eleves={eleves} config={config} terminologie={terminologie}
                groupesFiges={groupesFiges} onFiger={handleFiger} onDeplacer={handleDeplacer}
                lectureSeule={lectureSeule} langue={langue} />
            )
          })}

          {/* Tableau de synthèse */}
          <div className="card">
            <div className="card-title">📊 Tableau de synthèse</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Niveau</th><th>{terminologie.groupe}</th><th>Salle</th><th>Nom complet</th>
                    <th>Capacité</th><th>Acceptés</th><th>Libres</th><th>Remplissage</th>
                    {!lectureSeule && <th>État</th>}
                  </tr>
                </thead>
                <tbody>
                  {config.reglesAge.map(r => {
                    const resRaw2 = allocation.affectations[r.niveauId]
                    if (!resRaw2) return null
                    const res = resRaw2.classes ? resRaw2 : { ...resRaw2, classes: resRaw2.salle ? [{ classeId: r.niveauId+'_c1', classeNum: 1, salle: resRaw2.salle, nbAcceptes: resRaw2.acceptes||0, placesLibres: resRaw2.placesLibres||0, tauxRemplissage: resRaw2.tauxRemplissage||0, elevesIds: [] }] : [] }
                    if (!res.classes || res.classes.length === 0) return null
                    
                    return res.classes.map((cls, idx) => (
                      <tr key={cls.classeId}>
                        {idx === 0 && (
                          <td rowSpan={res.classes.length}>
                            <span className={`niveau-tag ${getNiveauClass(r.niveauId)}`} style={{ direction: 'auto' }}>{r.label}</span>
                            {res.nbAttente > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>⏳ {res.nbAttente} en attente</div>}
                          </td>
                        )}
                        <td style={{ fontWeight: 600 }}>{terminologie.groupe} {cls.classeNum}</td>
                        <td><strong>{cls.salle?.nom || '—'}</strong></td>
                        <td style={{ color: 'var(--ink-muted)', direction: 'auto' }}>{cls.salle?.nomComplet || '—'}</td>
                        <td>{cls.salle?.capacite || '—'}</td>
                        <td><span style={{ color: 'var(--success)', fontWeight: 700 }}>{cls.nbAcceptes}</span></td>
                        <td><span style={{ color: cls.placesLibres > 0 ? 'var(--warning)' : 'var(--ink-muted)' }}>{cls.placesLibres}</span></td>
                        <td><span style={{ fontWeight: 700 }}>{cls.tauxRemplissage}%</span></td>
                        {!lectureSeule && (
                          <td>{groupesFiges.has(cls.classeId) ? <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>🔒 Figé</span> : <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>Libre</span>}</td>
                        )}
                      </tr>
                    ))
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
            Aucune allocation calculée
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {eleves.length === 0
              ? 'Commencez par saisir des inscriptions, puis lancez le calcul.'
              : `${eleves.length} inscription(s) en attente. Cliquez sur "Calculer l'allocation".`
            }
          </div>
        </div>
      )}

      {/* Modal déplacement */}
      {eleveADeplacer && (
        <ModalDeplacer
          eleve={eleveADeplacer}
          niveauActuel={niveauEleveADeplacer}
          allocation={allocation}
          config={config}
          eleves={eleves}
          onConfirm={confirmerDeplacement}
          onClose={() => { setEleveADeplacer(null); setNiveauEleveADeplacer(null) }}
          langue={langue}
          terminologie={terminologie}
        />
      )}
    </div>
  )
}
