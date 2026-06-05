// src/pages/PageConfig.jsx
import { useState } from 'react'
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'

function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
}
function IconTrash() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

// ── Section Salles ──────────────────────────────────────────────────────────
function SectionSalles() {
  const { config, setConfig } = useApp()
  const toast = useToast()

  function majSalle(id, champ, val) {
    setConfig(prev => ({
      ...prev,
      salles: prev.salles.map(s => s.id === id ? { ...s, [champ]: champ === 'capacite' ? parseInt(val) || 0 : val } : s)
    }))
  }

  function ajouterSalle() {
    const newId = `s${Date.now()}`
    setConfig(prev => ({
      ...prev,
      salles: [...prev.salles, { id: newId, nom: `S${prev.salles.length + 1}`, capacite: 20 }]
    }))
  }

  function supprimerSalle(id) {
    if (config.salles.length <= 1) { toast('Il faut au moins une salle', 'error'); return }
    setConfig(prev => ({ ...prev, salles: prev.salles.filter(s => s.id !== id) }))
  }

  const capaciteTotale = config.salles.reduce((s, sl) => s + (sl.capacite || 0), 0)

  return (
    <div className="card">
      <div className="card-title">
        <span>🏫</span> Salles et capacités
      </div>

      <table>
        <thead>
          <tr>
            <th>Nom de la salle</th>
            <th>Capacité (élèves)</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {config.salles.map(s => (
            <tr key={s.id}>
              <td>
                <input
                  className="form-input"
                  value={s.nom}
                  onChange={e => majSalle(s.id, 'nom', e.target.value)}
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={s.capacite}
                  onChange={e => majSalle(s.id, 'capacite', e.target.value)}
                  style={{ width: 100 }}
                />
              </td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => supprimerSalle(s.id)}>
                  <IconTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 600, color: 'var(--ink-light)', paddingTop: 12 }}>
              Total : {config.salles.length} salle{config.salles.length > 1 ? 's' : ''}
            </td>
            <td style={{ fontWeight: 600, paddingTop: 12 }}>
              <span className="badge badge-info">{capaciteTotale} places</span>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={ajouterSalle}>
          <IconPlus /> Ajouter une salle
        </button>
      </div>
    </div>
  )
}

// ── Section Règles d'âge ────────────────────────────────────────────────────
function SectionReglesAge() {
  const { config, setConfig } = useApp()
  const toast = useToast()

  function majRegle(id, champ, val) {
    setConfig(prev => ({
      ...prev,
      reglesAge: prev.reglesAge.map(r =>
        r.id === id
          ? { ...r, [champ]: ['ageMin', 'ageMax'].includes(champ) ? parseInt(val) || 0 : val }
          : r
      )
    }))
  }

  function ajouterRegle() {
    const newId = `r${Date.now()}`
    const nextNum = config.reglesAge.length + 1
    setConfig(prev => ({
      ...prev,
      reglesAge: [...prev.reglesAge, {
        id: newId,
        niveauId: `annee${nextNum}`,
        label: `Année ${nextNum}`,
        ageMin: 6,
        ageMax: 6,
      }]
    }))
  }

  function supprimerRegle(id) {
    if (config.reglesAge.length <= 1) { toast('Il faut au moins un niveau', 'error'); return }
    setConfig(prev => ({ ...prev, reglesAge: prev.reglesAge.filter(r => r.id !== id) }))
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>📅</span> Règles d'attribution par âge
      </div>

      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Définissez la tranche d'âge correspondant à chaque niveau d'année.
      </div>

      <table>
        <thead>
          <tr>
            <th>Identifiant niveau</th>
            <th>Libellé affiché</th>
            <th>Âge min</th>
            <th>Âge max</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {config.reglesAge.map(r => (
            <tr key={r.id}>
              <td>
                <input
                  className="form-input"
                  value={r.niveauId}
                  onChange={e => majRegle(r.id, 'niveauId', e.target.value)}
                  style={{ width: 110, fontFamily: 'monospace', fontSize: '0.8rem' }}
                />
              </td>
              <td>
                <input
                  className="form-input"
                  value={r.label}
                  onChange={e => majRegle(r.id, 'label', e.target.value)}
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={25}
                  value={r.ageMin}
                  onChange={e => majRegle(r.id, 'ageMin', e.target.value)}
                  style={{ width: 70 }}
                />
              </td>
              <td>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={25}
                  value={r.ageMax}
                  onChange={e => majRegle(r.id, 'ageMax', e.target.value)}
                  style={{ width: 70 }}
                />
              </td>
              <td>
                <button className="btn btn-danger btn-sm" onClick={() => supprimerRegle(r.id)}>
                  <IconTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={ajouterRegle}>
          <IconPlus /> Ajouter un niveau
        </button>
      </div>
    </div>
  )
}

// ── Section Champs du formulaire ────────────────────────────────────────────
function SectionChamps() {
  const { config, setConfig } = useApp()
  const toast = useToast()

  function majChamp(id, champ, val) {
    setConfig(prev => ({
      ...prev,
      champs: prev.champs.map(c => c.id === id ? { ...c, [champ]: val } : c)
    }))
  }

  function ajouterChamp() {
    const newId = `custom_${Date.now()}`
    setConfig(prev => ({
      ...prev,
      champs: [...prev.champs, {
        id: newId,
        label: 'Nouveau champ',
        type: 'text',
        obligatoire: false,
        systeme: false,
        readonly: false,
      }]
    }))
  }

  function supprimerChamp(id) {
    const champ = config.champs.find(c => c.id === id)
    if (champ?.systeme) { toast('Les champs système ne peuvent pas être supprimés', 'error'); return }
    setConfig(prev => ({ ...prev, champs: prev.champs.filter(c => c.id !== id) }))
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>📋</span> Champs du formulaire d'inscription
      </div>

      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        Les champs système (Prénom, Nom, Date de naissance, Âge calculé) ne peuvent pas être supprimés mais peuvent être renommés.
      </div>

      <table>
        <thead>
          <tr>
            <th>Libellé du champ</th>
            <th>Type</th>
            <th>Obligatoire</th>
            <th>Statut</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {config.champs.map(c => (
            <tr key={c.id}>
              <td>
                <input
                  className="form-input"
                  value={c.label}
                  onChange={e => majChamp(c.id, 'label', e.target.value)}
                  style={{ width: '100%', minWidth: 140 }}
                />
              </td>
              <td>
                <span className="chip">
                  {c.type === 'computed' ? 'Calculé' : c.type === 'date' ? 'Date' : 'Texte'}
                </span>
              </td>
              <td>
                {!c.readonly && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={c.obligatoire}
                      onChange={e => majChamp(c.id, 'obligatoire', e.target.checked)}
                      disabled={c.systeme && c.id !== 'age'}
                    />
                    <span style={{ fontSize: '0.8rem', color: c.obligatoire ? 'var(--accent)' : 'var(--ink-muted)' }}>
                      {c.obligatoire ? 'Oui' : 'Non'}
                    </span>
                  </label>
                )}
              </td>
              <td>
                {c.systeme
                  ? <span className="badge badge-info">Système</span>
                  : <span className="badge badge-neutral">Personnalisé</span>
                }
              </td>
              <td>
                {!c.systeme && (
                  <button className="btn btn-danger btn-sm" onClick={() => supprimerChamp(c.id)}>
                    <IconTrash />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={ajouterChamp}>
          <IconPlus /> Ajouter un champ
        </button>
      </div>
    </div>
  )
}

// ── Section Mode calcul de l'âge ───────────────────────────────────────────
function SectionModeCalculAge() {
  const { config, setConfig } = useApp()

  const modes = [
    {
      id: 'annee',
      label: 'Année seulement',
      description: 'Différence brute d\'années : 2026 − 2019 = 7, quel que soit le mois ou le jour de naissance.',
      exemple: 'Né le 25/12/2019 → 7 ans en janvier 2026',
    },
    {
      id: 'annee_mois',
      label: 'Année + Mois',
      description: 'Années entières, en attendant que le mois d\'anniversaire soit passé.',
      exemple: 'Né en décembre 2019 → 6 ans jusqu\'en décembre 2026',
    },
    {
      id: 'annee_mois_jour',
      label: 'Année + Mois + Jour',
      description: 'Précision maximale : l\'anniversaire doit être passé au jour près.',
      exemple: 'Né le 26/05/2019 → 6 ans jusqu\'au 26/05/2026',
    },
  ]

  return (
    <div className="card">
      <div className="card-title">
        <span>🎂</span> Règle de calcul de l'âge
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {modes.map(m => (
          <label
            key={m.id}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              border: `2px solid ${config.modeCalculAge === m.id ? 'var(--accent)' : 'var(--paper3)'}`,
              background: config.modeCalculAge === m.id ? 'rgba(200,64,26,0.04)' : 'var(--white)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="radio"
              name="modeCalculAge"
              value={m.id}
              checked={config.modeCalculAge === m.id}
              onChange={() => setConfig(prev => ({ ...prev, modeCalculAge: m.id }))}
              style={{ marginTop: 3, accentColor: 'var(--accent)' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--ink)', marginBottom: 3 }}>
                {m.label}
                {m.id === 'annee' && (
                  <span style={{ marginLeft: 8, fontSize: '0.72rem', background: 'var(--paper2)', padding: '1px 7px', borderRadius: 10, color: 'var(--ink-muted)' }}>
                    Défaut
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: 4 }}>{m.description}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>
                Exemple : {m.exemple}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
export default function PageConfig() {
  const { setConfig, reinitialiser, chargerDonneesTest, eleves } = useApp()
  const toast = useToast()

  function resetConfig() {
    if (eleves.length > 0) {
      if (!window.confirm('Réinitialiser la configuration et effacer toutes les inscriptions ?')) return
    }
    setConfig(DEFAULT_CONFIG)
    reinitialiser()
    toast('Configuration réinitialisée', 'info')
  }

  function loadTest() {
    if (eleves.length > 0) {
      if (!window.confirm('Charger les données de test et remplacer les inscriptions existantes ?')) return
    }
    chargerDonneesTest()
    toast('Données de test chargées (3 salles, 21 élèves)', 'success')
  }

  return (
    <div className="page">
      <h2 className="page-title">Configuration</h2>
      <p className="page-subtitle">Paramétrez les salles, les règles d'attribution et les champs du formulaire.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-warning" onClick={loadTest}>
          🧪 Charger données de test
        </button>
        <button className="btn btn-ghost" onClick={resetConfig}>
          ↩ Réinitialiser la configuration
        </button>
      </div>

      <SectionSalles />
      <SectionModeCalculAge />
      <SectionReglesAge />
      <SectionChamps />
    </div>
  )
}
