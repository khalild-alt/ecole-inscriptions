// src/App.jsx
import { useAuth } from './lib/useAuth'
import { useApp, DEFAULT_CONFIG } from './store/appStore'
import PageLogin from './pages/PageLogin'
import PageAnnees from './pages/PageAnnees'
import PageSuperAdmin from './pages/PageSuperAdmin'
import PageConfigSalles from './pages/PageConfigSalles'
import PageConfigInterface from './pages/PageConfigInterface'
import PageInscriptions from './pages/PageInscriptions'
import PageAllocation from './pages/PageAllocation'
import PageExport from './pages/PageExport'

function NomEtablissement({ nom, style }) {
  if (!nom) return null
  const hasArabic = /[\u0600-\u06FF]/.test(nom)
  return (
    <span style={{
      fontFamily: hasArabic ? "'Noto Sans Arabic', sans-serif" : 'inherit',
      direction: hasArabic ? 'rtl' : 'ltr',
      ...style
    }}>
      {nom}
    </span>
  )
}

export default function App() {
  const { session, profil, loading: authLoading, logout } = useAuth()
  const { annee, onglet, setOnglet, eleves, allocation, chargerAnnee, reinitialiser, dbLoading, config } = useApp()

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
        <div style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Chargement…</div>
      </div>
    )
  }

  if (!session || !profil) return <PageLogin />

  const role = profil.role
  const anneeArchivee = annee?.statut === 'archivee'
  const nomsOnglets = config?.nomsOnglets || DEFAULT_CONFIG.nomsOnglets
  const nomEtab = profil.etablissements?.nom || ''

  const tousOnglets = [
    { id: 'config_salles',    roles: ['admin', 'superadmin'] },
    { id: 'config_interface', roles: ['admin', 'superadmin'] },
    { id: 'inscriptions',     roles: ['admin', 'superadmin', 'operateur'] },
    { id: 'allocation',       roles: ['admin', 'superadmin', 'operateur'] },
    { id: 'export',           roles: ['admin', 'superadmin', 'operateur'] },
  ]
  const ongletsFiltres = tousOnglets.filter(o => o.roles.includes(role))

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header no-print">
        <div className="header-left">
          {annee && (
            <button onClick={reinitialiser} style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.4)',
              cursor: 'pointer',
              padding: '5px 14px',
              borderRadius: 6,
              marginBottom: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>
                ← Changer d'année
              </span>
            </button>
          )}
          <div className="header-etab">
            <NomEtablissement nom={nomEtab} style={{ color: 'white' }} />
          </div>
          {annee && (
            <div className="header-annee">
              {annee.label}
              {anneeArchivee && <span className="header-archive-badge">🔒 Archive — lecture seule</span>}
            </div>
          )}
        </div>

        <div className="header-right">
          {annee && (
            <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>
              {eleves.length} élève{eleves.length > 1 ? 's' : ''} · {allocation ? '✓ Allocation' : 'Pas d\'allocation'}
            </div>
          )}
          <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>
            {profil.prenom} {profil.nom}
            <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>({role})</span>
          </div>
          {role === 'superadmin' && !annee && (
            <button className="btn btn-sm" style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1.5px solid rgba(255,255,255,0.5)',
              fontWeight: 600,
            }}
              onClick={() => setOnglet('superadmin')}>
              ⚙ Gestion Admin
            </button>
          )}
          <button className="btn btn-sm" style={{
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '1.5px solid rgba(255,255,255,0.4)',
            fontWeight: 600,
          }}
            onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Superadmin sans année ── */}
      {role === 'superadmin' && !annee && onglet === 'superadmin' ? (
        <main style={{ flex: 1 }}><PageSuperAdmin /></main>
      ) : !annee ? (
        <main style={{ flex: 1 }}>
          <PageAnnees onSelectAnnee={a => {
            chargerAnnee(a)
            setOnglet(role === 'operateur' ? 'inscriptions' : 'config_salles')
          }} />
        </main>
      ) : (
        <>
          {dbLoading && (
            <div style={{ background: 'var(--accent)', color: 'white', textAlign: 'center', padding: '8px', fontSize: '0.88rem', fontWeight: 600 }} className="no-print">
              ⏳ Synchronisation en cours…
            </div>
          )}

          {/* Bannière établissement */}
          <div className="etab-banner no-print" style={{
            background: '#16213e',
            borderBottom: '2px solid rgba(255,255,255,0.12)',
            padding: '7px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Établissement :
            </span>
            <NomEtablissement nom={nomEtab} style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#fbbf24',
            }} />
            {annee && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                <span style={{ fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>
                  {annee.label}
                </span>
                {anneeArchivee && (
                  <span style={{ fontSize: '0.78rem', color: '#fbbf24', marginLeft: 4 }}>🔒 Archive</span>
                )}
              </>
            )}
          </div>

          {/* ── Onglets sticky ── */}
          <nav className="app-tabs no-print" style={{ position: 'sticky', top: '70px', zIndex: 90 }}>
            {ongletsFiltres.map(o => {
              const nom = nomsOnglets[o.id] || DEFAULT_CONFIG.nomsOnglets[o.id] || { icone: '', label: o.id }
              const hasArabic = /[\u0600-\u06FF]/.test(nom.label)
              return (
                <button key={o.id} className={`tab-btn${onglet === o.id ? ' active' : ''}`} onClick={() => setOnglet(o.id)}>
                  <span className="tab-icon">{nom.icone}</span>
                  <span style={{
                    direction: hasArabic ? 'rtl' : 'ltr',
                    fontFamily: hasArabic ? "'Noto Sans Arabic', sans-serif" : 'inherit',
                  }}>
                    {nom.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <main style={{ flex: 1 }}>
            {onglet === 'config_salles'    && <PageConfigSalles    lectureSeule={anneeArchivee || role === 'operateur'} />}
            {onglet === 'config_interface' && <PageConfigInterface  lectureSeule={anneeArchivee || role === 'operateur'} />}
            {onglet === 'inscriptions'     && <PageInscriptions     lectureSeule={anneeArchivee} />}
            {onglet === 'allocation'       && <PageAllocation       lectureSeule={anneeArchivee} nomEtab={nomEtab} anneeLabel={annee?.label} />}
            {onglet === 'export'           && <PageExport           nomEtab={nomEtab} anneeLabel={annee?.label} />}
          </main>
        </>
      )}
    </div>
  )
}
