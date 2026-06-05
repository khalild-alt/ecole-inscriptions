// src/pages/PageConfigSalles.jsx
import { useState } from 'react'
import { useApp, DEFAULT_CONFIG, TEST_CONFIG, TEST_ELEVES, calculerAge, determinerNiveau } from '../store/appStore'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'

function IconPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

function SectionSalles({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const toast = useToast()

  function majSalle(id, champ, val) {
    setConfig(prev => ({ ...prev, salles: prev.salles.map(s => s.id === id ? { ...s, [champ]: champ === 'capacite' ? parseInt(val) || 0 : val } : s) }))
  }

  function ajouterSalle() {
    const newId = `s${Date.now()}`
    setConfig(prev => ({ ...prev, salles: [...prev.salles, { id: newId, nom: `S${prev.salles.length + 1}`, capacite: 20 }] }))
  }

  function supprimerSalle(id, nom) {
    if (config.salles.length <= 1) { toast('Il faut au moins une salle', 'error'); return }
    if (!window.confirm(`Supprimer la salle "${nom}" ?\n\nCette action est irréversible.`)) return
    setConfig(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== id) }))
  }

  const capaciteTotale = config.salles.reduce((s, sl) => s + (sl.capacite || 0), 0)

  return (
    <div className="card">
      <div className="card-title">🏫 Salles et capacités</div>
      {lectureSeule && <div className="alert alert-warning">Année archivée — lecture seule</div>}
      <table>
        <thead>
          <tr><th>Nom de la salle</th><th>Capacité (élèves)</th>{!lectureSeule && <th style={{ width: 60 }}></th>}</tr>
        </thead>
        <tbody>
          {config.salles.map(s => (
            <tr key={s.id}>
              <td>
                <input className="form-input" value={s.nom} disabled={lectureSeule}
                  onChange={e => majSalle(s.id, 'nom', e.target.value)} style={{ width: 120 }} />
              </td>
              <td>
                <input className="form-input" type="number" min={1} value={s.capacite} disabled={lectureSeule}
                  onChange={e => majSalle(s.id, 'capacite', e.target.value)} style={{ width: 100 }} />
              </td>
              {!lectureSeule && (
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => supprimerSalle(s.id, s.nom)}>
                    <IconTrash />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 600, color: 'var(--ink-light)', paddingTop: 12 }}>
              Total : {config.salles.length} salle{config.salles.length > 1 ? 's' : ''}
            </td>
            <td style={{ paddingTop: 12 }}><span className="badge badge-info">{capaciteTotale} places</span></td>
            {!lectureSeule && <td></td>}
          </tr>
        </tfoot>
      </table>
      {!lectureSeule && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={ajouterSalle}>
            <IconPlus /> Ajouter une salle
          </button>
        </div>
      )}
    </div>
  )
}

function SectionModeCalculAge({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const modes = [
    { id: 'annee', label: 'Année seulement', description: 'Différence brute d\'années : 2026 − 2019 = 7, quel que soit le mois ou le jour.', exemple: 'Né le 25/12/2019 → 7 ans en janvier 2026' },
    { id: 'annee_mois', label: 'Année + Mois', description: 'Années entières, en attendant que le mois d\'anniversaire soit passé.', exemple: 'Né en décembre 2019 → 6 ans jusqu\'en décembre 2026' },
    { id: 'annee_mois_jour', label: 'Année + Mois + Jour', description: 'Précision maximale : l\'anniversaire doit être passé au jour près.', exemple: 'Né le 26/05/2019 → 6 ans jusqu\'au 26/05/2026' },
  ]
  return (
    <div className="card">
      <div className="card-title">🎂 Règle de calcul de l'âge</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modes.map(m => (
          <label key={m.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 'var(--radius)', border: `2px solid ${config.modeCalculAge === m.id ? 'var(--accent)' : 'var(--paper3)'}`, background: config.modeCalculAge === m.id ? 'rgba(200,64,26,0.04)' : 'var(--white)', cursor: lectureSeule ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            <input type="radio" name="modeCalculAge" value={m.id} checked={config.modeCalculAge === m.id} disabled={lectureSeule}
              onChange={() => !lectureSeule && setConfig(prev => ({ ...prev, modeCalculAge: m.id }))} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: 3 }}>
                {m.label}
                {m.id === 'annee' && <span style={{ marginLeft: 8, fontSize: '0.72rem', background: 'var(--paper2)', padding: '1px 7px', borderRadius: 10, color: 'var(--ink-muted)' }}>Défaut</span>}
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', marginBottom: 3 }}>{m.description}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>Exemple : {m.exemple}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

function SectionReglesAge({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const toast = useToast()

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
    if (!window.confirm(`Supprimer le niveau "${label}" ?\n\nTous les élèves associés à ce niveau n'auront plus de niveau attribué.`)) return
    setConfig(prev => ({ ...prev, reglesAge: prev.reglesAge.filter(r => r.id !== id) }))
  }

  return (
    <div className="card">
      <div className="card-title">📅 Règles d'attribution par âge</div>
      <div className="alert alert-info">Définissez la tranche d'âge correspondant à chaque niveau d'année.</div>
      <table>
        <thead><tr><th>Identifiant</th><th>Libellé affiché</th><th>Âge min</th><th>Âge max</th>{!lectureSeule && <th style={{ width: 60 }}></th>}</tr></thead>
        <tbody>
          {config.reglesAge.map(r => (
            <tr key={r.id}>
              <td><input className="form-input" value={r.niveauId} disabled={lectureSeule} onChange={e => majRegle(r.id, 'niveauId', e.target.value)} style={{ width: 110, fontFamily: 'monospace', fontSize: '0.82rem' }} /></td>
              <td><input className="form-input" value={r.label} disabled={lectureSeule} onChange={e => majRegle(r.id, 'label', e.target.value)} style={{ width: 150 }} /></td>
              <td><input className="form-input" type="number" min={1} max={25} value={r.ageMin} disabled={lectureSeule} onChange={e => majRegle(r.id, 'ageMin', e.target.value)} style={{ width: 70 }} /></td>
              <td><input className="form-input" type="number" min={1} max={25} value={r.ageMax} disabled={lectureSeule} onChange={e => majRegle(r.id, 'ageMax', e.target.value)} style={{ width: 70 }} /></td>
              {!lectureSeule && <td><button className="btn btn-danger btn-sm" onClick={() => supprimerRegle(r.id, r.label)}><IconTrash /></button></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {!lectureSeule && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={ajouterRegle}><IconPlus /> Ajouter un niveau</button>
        </div>
      )}
    </div>
  )
}

function SectionModeOptimisation({ lectureSeule }) {
  const { config, setConfig, modeAllocation, setModeAllocation } = useApp()

  function changer(mode) {
    setModeAllocation(mode)
    setConfig(prev => ({ ...prev, modeAllocationDefaut: mode }))
  }

  return (
    <div className="card">
      <div className="card-title">⚙️ Mode d'optimisation par défaut</div>
      <div className="alert alert-info">
        Ce mode sera utilisé par défaut lors du calcul d'allocation. Il peut être changé ponctuellement dans l'onglet Allocation.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { id: 'B', label: 'Mode B — Maximiser le nombre d\'élèves acceptés', desc: 'Recommandé pour un usage courant. Accepte le plus grand nombre d\'élèves possible.' },
          { id: 'A', label: 'Mode A — Maximiser le taux de remplissage des salles', desc: 'Optimise l\'utilisation des salles. Peut accepter moins d\'élèves mais avec un meilleur remplissage.' },
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
  const { setConfig, reinitialiser, chargerDonneesTest, eleves, annee } = useApp()
  const toast = useToast()

  async function loadTest() {
    if (!window.confirm('Charger les données de test ?\n\nCela remplacera la configuration actuelle et effacera toutes les inscriptions existantes.')) return
    await chargerDonneesTest()
    toast('Données de test chargées (3 salles, 21 élèves)', 'success')
  }

  return (
    <div className="page">
      <h2 className="page-title">Configuration des salles</h2>
      <p className="page-subtitle">Paramétrez les salles, les règles d'âge et le mode d'optimisation.</p>

      {!lectureSeule && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <button className="btn btn-warning" onClick={loadTest}>🧪 Charger données de test</button>
        </div>
      )}

      <SectionSalles lectureSeule={lectureSeule} />
      <SectionModeCalculAge lectureSeule={lectureSeule} />
      <SectionReglesAge lectureSeule={lectureSeule} />
      <SectionModeOptimisation lectureSeule={lectureSeule} />
    </div>
  )
}
