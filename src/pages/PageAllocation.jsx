// src/pages/PageAllocation.jsx
import { useApp, DEFAULT_CONFIG } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'

function getNiveauClass(niveauId) {
  const map = { annee1: 'niveau-annee1', annee2: 'niveau-annee2', annee3: 'niveau-annee3', annee4: 'niveau-annee4' }
  return map[niveauId] || 'niveau-inconnu'
}

function nomSalle(salle) {
  if (!salle) return '—'
  return salle.nomComplet ? `${salle.nom} — ${salle.nomComplet}` : salle.nom
}

function CarteGroupe({ classe, niveauLabel, eleves, config, terminologie }) {
  const taux = parseFloat(classe.tauxRemplissage)
  const terme = terminologie?.groupe || 'Groupe'
  const nomGroupe = `${niveauLabel} — ${terme} ${classe.classeNum} — ${nomSalle(classe.salle)}`

  // Élèves de ce groupe (par ordre d'inscription, limité à la capacité)
  const elevesGroupe = eleves
    .filter(e => classe.elevesIds && classe.elevesIds.includes(e.id))
    .sort((a, b) => new Date(a.dateInscription) - new Date(b.dateInscription))

  const champsVisibles = config.champs.filter(c => c.type !== 'computed' && c.type !== 'date' || c.id === 'dateNaissance')

  return (
    <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1.5px solid var(--paper3)', marginBottom: 10, overflow: 'hidden' }}>
      {/* En-tête */}
      <div style={{
        background: taux === 100 ? '#2d7a4f' : taux >= 80 ? '#1a5fa0' : '#b07d1a',
        color: 'white', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', direction: 'auto' }}>{nomGroupe}</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: 2 }}>
            {classe.nbAcceptes}/{classe.salle?.capacite} élèves · {taux}% de remplissage
            {classe.placesLibres > 0 && ` · ${classe.placesLibres} place(s) libre(s)`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{taux}%</div>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 8, background: 'var(--paper2)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, taux)}%`, background: taux === 100 ? 'var(--success)' : taux >= 80 ? 'var(--info)' : 'var(--warning)', transition: 'width 0.4s' }} />
      </div>

      {/* Liste des élèves */}
      {elevesGroupe.length > 0 && (
        <div style={{ padding: '12px 16px' }}>
          <details open={elevesGroupe.length <= 10}>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-light)', marginBottom: 8 }}>
              👥 {elevesGroupe.length} élève{elevesGroupe.length > 1 ? 's' : ''} ▾
            </summary>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.75rem' }}>#</th>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <th key={c.id} style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--ink-muted)', fontWeight: 600, fontSize: '0.75rem', direction: 'auto' }}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {elevesGroupe.map((e, idx) => (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                      <td style={{ padding: '5px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                      {config.champs.filter(c => c.type !== 'computed').map(c => (
                        <td key={c.id} style={{ padding: '5px 8px', direction: 'auto' }}>
                          {e[c.id] || '—'}
                        </td>
                      ))}
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

function CarteNiveau({ niveauId, label, res, eleves, config, terminologie }) {
  const enAttente = eleves.filter(e => e.niveauId === niveauId && e.statut === 'liste_attente')

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '2px solid var(--paper2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`niveau-tag ${getNiveauClass(niveauId)}`} style={{ fontSize: '0.95rem', padding: '4px 14px', direction: 'auto' }}>
            {label}
          </span>
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
        <CarteGroupe key={cls.classeId} classe={cls} niveauLabel={label} eleves={eleves} config={config} terminologie={terminologie} />
      ))}

      {enAttente.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
            ⏳ Liste d'attente : {enAttente.length} élève{enAttente.length > 1 ? 's' : ''} ▾
          </summary>
          <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
            <table style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem' }}>#</th>
                  {config.champs.filter(c => c.type !== 'computed').map(c => (
                    <th key={c.id} style={{ padding: '3px 8px', color: 'var(--ink-muted)', fontSize: '0.75rem', direction: 'auto' }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enAttente.map((e, idx) => (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--paper2)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--ink-muted)' }}>{idx + 1}</td>
                    {config.champs.filter(c => c.type !== 'computed').map(c => (
                      <td key={c.id} style={{ padding: '4px 8px', direction: 'auto' }}>{e[c.id] || '—'}</td>
                    ))}
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
  const { config, eleves, allocation, lancerOptimisation } = useApp()
  const { langue } = useI18n()
  const toast = useToast()
  const terminologie = config.terminologie || DEFAULT_CONFIG.terminologie || { groupe: 'Groupe', annee: 'Année' }

  function handleOptimiser() {
    if (eleves.length === 0) { toast(langue === 'ar' ? 'لا توجد تسجيلات' : 'Aucune inscription à traiter', 'error'); return }
    lancerOptimisation()
    toast(langue === 'ar' ? 'جاري الحساب…' : 'Calcul lancé…', 'info')
  }

  const totalEleves = eleves.length
  const totalAcceptes = eleves.filter(e => e.statut === 'accepte').length
  const totalAttente = eleves.filter(e => e.statut === 'liste_attente').length
  const totalCapacite = allocation
    ? Object.values(allocation.affectations).reduce((s, r) => s + (r.placesTotales || 0), 0)
    : 0
  const tauxGlobal = totalCapacite > 0 ? ((totalAcceptes / totalCapacite) * 100).toFixed(1) : 0

  return (
    <div className="page">
      <h2 className="page-title">{langue === 'ar' ? 'توزيع الأقسام' : 'Allocation des salles'}</h2>
      <p className="page-subtitle">
        {langue === 'ar'
          ? 'كل الصّالات مستخدمة. يمكن أن يضم المستوى الواحد عدة أقسام.'
          : `Toutes les salles utilisées. Chaque ${terminologie.groupe.toLowerCase()} affiché avec sa salle et la liste complète des élèves.`}
      </p>

      {!lectureSeule && (
        <div className="card">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-xl" onClick={handleOptimiser} disabled={eleves.length === 0}>
              ▶ {langue === 'ar' ? 'حساب التوزيع' : 'Calculer l\'allocation'}
            </button>
            <div style={{ fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
              {langue === 'ar'
                ? 'يضمن الخوارزمي استخدام جميع الصّالات مع تعظيم عدد التلاميذ المقبولين.'
                : 'L\'algorithme garantit l\'utilisation de toutes les salles et maximise les élèves acceptés.'}
            </div>
          </div>
        </div>
      )}

      {allocation ? (
        <>
          <div className="stats-row">
            <div className="stat-card"><div className="stat-value">{totalEleves}</div><div className="stat-label">{langue === 'ar' ? 'مجموع الطلبات' : 'Demandes totales'}</div></div>
            <div className="stat-card success"><div className="stat-value">{totalAcceptes}</div><div className="stat-label">{langue === 'ar' ? 'المقبولون' : 'Élèves acceptés'}</div></div>
            <div className="stat-card warning"><div className="stat-value">{totalAttente}</div><div className="stat-label">{langue === 'ar' ? 'قائمة الانتظار' : 'Liste d\'attente'}</div></div>
            <div className="stat-card info"><div className="stat-value">{tauxGlobal}%</div><div className="stat-label">{langue === 'ar' ? 'نسبة الإشغال' : 'Remplissage global'}</div></div>
            <div className="stat-card neutral"><div className="stat-value">{totalCapacite}</div><div className="stat-label">{langue === 'ar' ? 'الطاقة الإجمالية' : 'Capacité totale'}</div></div>
          </div>

          <div style={{ marginBottom: 16, fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
            {langue === 'ar' ? 'تم الحساب بتاريخ' : 'Calculé le'} {new Date(allocation.date).toLocaleString('fr-FR')}
          </div>

          {config.reglesAge.map(r => {
            const res = allocation.affectations[r.niveauId]
            if (!res || !res.classes) return null
            return (
              <CarteNiveau key={r.niveauId} niveauId={r.niveauId} label={r.label} res={res}
                eleves={eleves} config={config} terminologie={terminologie} />
            )
          })}

          {/* Tableau de synthèse */}
          <div className="card">
            <div className="card-title">📊 {langue === 'ar' ? 'جدول الملخص' : 'Tableau de synthèse'}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{langue === 'ar' ? 'المستوى' : 'Niveau'}</th>
                    <th>{terminologie.groupe}</th>
                    <th>{langue === 'ar' ? 'الصّالة' : 'Salle'}</th>
                    <th>{langue === 'ar' ? 'الاسم الكامل' : 'Nom complet'}</th>
                    <th>{langue === 'ar' ? 'الطاقة' : 'Capacité'}</th>
                    <th>{langue === 'ar' ? 'المقبولون' : 'Acceptés'}</th>
                    <th>{langue === 'ar' ? 'الشاغر' : 'Libres'}</th>
                    <th>{langue === 'ar' ? 'الإشغال' : 'Remplissage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {config.reglesAge.map(r => {
                    const res = allocation.affectations[r.niveauId]
                    if (!res || !res.classes) return null
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
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 50, height: 6, background: 'var(--paper2)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${cls.tauxRemplissage}%`, height: '100%', background: parseFloat(cls.tauxRemplissage) >= 90 ? 'var(--success)' : 'var(--warning)', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 700 }}>{cls.tauxRemplissage}%</span>
                          </div>
                        </td>
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
            {langue === 'ar' ? 'لم يتم حساب التوزيع بعد' : 'Aucune allocation calculée'}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {eleves.length === 0
              ? (langue === 'ar' ? 'ابدأ بإدخال التسجيلات ثم أطلق الحساب.' : 'Commencez par saisir des inscriptions, puis lancez le calcul.')
              : `${eleves.length} inscription(s) en attente. Cliquez sur "Calculer l'allocation".`
            }
          </div>
        </div>
      )}
    </div>
  )
}
