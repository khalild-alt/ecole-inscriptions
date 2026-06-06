// src/pages/PageConfigInterface.jsx
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'

function IconPlus() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}

// ── Noms des onglets ─────────────────────────────────────────
function SectionTerminologie({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const terminologie = config.terminologie || { groupe: 'Groupe', annee: 'Année' }

  function maj(champ, val) {
    setConfig(prev => ({ ...prev, terminologie: { ...(prev.terminologie || {}), [champ]: val } }))
  }

  return (
    <div className="card">
      <div className="card-title">📝 Terminologie</div>
      <div className="alert alert-info">
        Personnalisez les termes utilisés dans l'interface et les exports. Par exemple : "Groupe" peut devenir "Division", "Classe", "قسم"...
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Terme pour "Groupe"</label>
          <input className="form-input" value={terminologie.groupe || 'Groupe'} disabled={lectureSeule}
            onChange={e => maj('groupe', e.target.value)}
            placeholder="Groupe, Classe, Division, قسم..."
            style={{ direction: 'auto' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 4 }}>
            Utilisé dans : Allocation, Export — ex: "Année1-{terminologie.groupe || 'Groupe'}1"
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Terme pour "Année"</label>
          <input className="form-input" value={terminologie.annee || 'Année'} disabled={lectureSeule}
            onChange={e => maj('annee', e.target.value)}
            placeholder="Année, Niveau, سنة..."
            style={{ direction: 'auto' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 4 }}>
            Préfixe des niveaux dans l'allocation — ex: "{terminologie.annee || 'Année'}1-{terminologie.groupe || 'Groupe'}1"
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionNomsOnglets({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const nomsOnglets = config.nomsOnglets || DEFAULT_CONFIG.nomsOnglets

  const ongletsDefs = [
    { id: 'config_salles',    defLabel: 'Config. Salles',     defIcone: '🏫' },
    { id: 'config_interface', defLabel: 'Config. Interface',  defIcone: '⚙️' },
    { id: 'inscriptions',     defLabel: 'Inscriptions',       defIcone: '✏️' },
    { id: 'allocation',       defLabel: 'Allocation',         defIcone: '📊' },
    { id: 'export',           defLabel: 'Export',             defIcone: '📤' },
  ]

  function majOnglet(id, champ, val) {
    const nouveau = { ...nomsOnglets, [id]: { ...nomsOnglets[id], [champ]: val } }
    setConfig(prev => ({ ...prev, nomsOnglets: nouveau }))
  }

  function resetOnglet(id, def) {
    const nouveau = { ...nomsOnglets, [id]: { icone: def.defIcone, label: def.defLabel } }
    setConfig(prev => ({ ...prev, nomsOnglets: nouveau }))
  }

  return (
    <div className="card">
      <div className="card-title">🏷️ Noms des onglets de navigation</div>
      <div className="alert alert-info">
        Personnalisez les noms et icônes des onglets. Vous pouvez utiliser du texte en arabe ou dans toute autre langue.
      </div>
      <table>
        <thead>
          <tr><th>Onglet</th><th>Icône</th><th>Libellé affiché</th><th>Aperçu</th>{!lectureSeule && <th></th>}</tr>
        </thead>
        <tbody>
          {ongletsDefs.map(def => {
            const onglet = nomsOnglets[def.id] || { icone: def.defIcone, label: def.defLabel }
            return (
              <tr key={def.id}>
                <td style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>{def.defLabel}</td>
                <td>
                  <input className="form-input" value={onglet.icone} disabled={lectureSeule}
                    onChange={e => majOnglet(def.id, 'icone', e.target.value)}
                    style={{ width: 60, textAlign: 'center', fontSize: '1.2rem' }} />
                </td>
                <td>
                  <input className="form-input" value={onglet.label} disabled={lectureSeule}
                    onChange={e => majOnglet(def.id, 'label', e.target.value)}
                    style={{ width: 200, direction: 'auto' }}
                    placeholder="Nom de l'onglet..." />
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--ink)', color: 'white', borderRadius: 6, fontSize: '0.9rem', fontWeight: 600 }}>
                    <span>{onglet.icone}</span>
                    <span style={{ direction: 'auto' }}>{onglet.label}</span>
                  </span>
                </td>
                {!lectureSeule && (
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => resetOnglet(def.id, def)} title="Remettre la valeur par défaut">
                      ↩
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Champs du formulaire ─────────────────────────────────────
function SectionChamps({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const toast = useToast()

  function majChamp(id, champ, val) {
    setConfig(prev => ({ ...prev, champs: prev.champs.map(c => c.id === id ? { ...c, [champ]: val } : c) }))
  }

  function ajouterChamp() {
    const newId = `custom_${Date.now()}`
    setConfig(prev => ({ ...prev, champs: [...prev.champs, { id: newId, label: 'Nouveau champ', type: 'text', obligatoire: false, systeme: false, readonly: false }] }))
  }

  function supprimerChamp(id, label) {
    const champ = config.champs.find(c => c.id === id)
    if (champ?.systeme) { toast('Les champs système ne peuvent pas être supprimés', 'error'); return }
    if (!window.confirm(`Supprimer le champ "${label}" ?\n\nLes données saisies dans ce champ pour les élèves existants seront perdues.`)) return
    setConfig(prev => ({ ...prev, champs: prev.champs.filter(c => c.id !== id) }))
  }

  return (
    <div className="card">
      <div className="card-title">📋 Champs du formulaire d'inscription</div>
      <div className="alert alert-warning">
        Les champs système (Prénom, Nom, Date de naissance, Âge calculé) ne peuvent pas être supprimés mais peuvent être renommés.
      </div>
      <table>
        <thead>
          <tr><th>Libellé du champ</th><th>Type</th><th>Obligatoire</th><th>Statut</th>{!lectureSeule && <th style={{ width: 60 }}></th>}</tr>
        </thead>
        <tbody>
          {config.champs.map(c => (
            <tr key={c.id}>
              <td>
                <input className="form-input" value={c.label} disabled={lectureSeule}
                  onChange={e => majChamp(c.id, 'label', e.target.value)}
                  style={{ width: '100%', minWidth: 160, direction: 'auto' }} />
              </td>
              <td>
                <span className="chip">
                  {c.type === 'computed' ? 'Calculé' : c.type === 'date' ? 'Date' : 'Texte'}
                </span>
              </td>
              <td>
                {!c.readonly && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={c.obligatoire} disabled={lectureSeule || (c.systeme && c.id !== 'age')}
                      onChange={e => majChamp(c.id, 'obligatoire', e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.88rem', color: c.obligatoire ? 'var(--accent)' : 'var(--ink-muted)', fontWeight: 600 }}>
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
              {!lectureSeule && (
                <td>
                  {!c.systeme && (
                    <button className="btn btn-danger btn-sm" onClick={() => supprimerChamp(c.id, c.label)}>
                      <IconTrash />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!lectureSeule && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" onClick={ajouterChamp}>
            <IconPlus /> Ajouter un champ
          </button>
        </div>
      )}
    </div>
  )
}

function SectionLangue({ lectureSeule }) {
  const { config, setConfig } = useApp()
  const langue = config.langue || 'fr'

  return (
    <div className="card">
      <div className="card-title">🌐 Langue de l'interface</div>
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Choisissez la langue d'affichage. Le changement s'applique immédiatement à toute l'interface.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { id: 'fr', label: 'Français', desc: 'Interface en français (par défaut)', flag: '🇫🇷' },
          { id: 'ar', label: 'العربية', desc: 'الواجهة باللغة العربية', flag: '🇹🇳', arabic: true },
        ].map(l => (
          <label key={l.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 18px', borderRadius: 'var(--radius)', border: `2px solid ${langue === l.id ? 'var(--accent)' : 'var(--paper3)'}`, background: langue === l.id ? 'rgba(200,64,26,0.04)' : 'var(--white)', cursor: lectureSeule ? 'default' : 'pointer' }}>
            <input type="radio" name="langue" value={l.id} checked={langue === l.id} disabled={lectureSeule}
              onChange={() => !lectureSeule && setConfig(prev => ({ ...prev, langue: l.id }))}
              style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: '1.5rem' }}>{l.flag}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: l.arabic ? "'Noto Sans Arabic',sans-serif" : 'inherit', direction: l.arabic ? 'rtl' : 'ltr' }}>{l.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', fontFamily: l.arabic ? "'Noto Sans Arabic',sans-serif" : 'inherit' }}>{l.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function PageConfigInterface({ lectureSeule }) {
  return (
    <div className="page">
      <h2 className="page-title">Configuration de l'interface</h2>
      <p className="page-subtitle">Personnalisez les noms des onglets, les champs du formulaire et la langue.</p>
      <SectionLangue lectureSeule={lectureSeule} />
      <SectionTerminologie lectureSeule={lectureSeule} />
      <SectionNomsOnglets lectureSeule={lectureSeule} />
      <SectionChamps lectureSeule={lectureSeule} />
    </div>
  )
}

// ── Sélecteur de langue (ajouté en fin de fichier, remplace l'export default) ──
