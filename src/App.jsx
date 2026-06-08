// src/App.jsx
import { useAuth } from './lib/useAuth'
import { useApp, DEFAULT_CONFIG } from './store/appStore'
import { useI18n } from './i18n/useI18n'
import PageLogin from './pages/PageLogin'
import PageAnnees from './pages/PageAnnees'
import PageSuperAdmin from './pages/PageSuperAdmin'
import PageConfigSalles from './pages/PageConfigSalles'
import PageConfigInterface from './pages/PageConfigInterface'
import PageInscriptions from './pages/PageInscriptions'
import PageAllocation from './pages/PageAllocation'
import PageRestauration from './pages/PageRestauration'

// Couleur vert kaki foncé pour le menu
const KAKI = '#3b4a2f'
const KAKI_DARK = '#2d3923'
const KAKI_LIGHT = '#4a5c3a'

function NomEtab({ nom, style }) {
  if (!nom) return null
  const arab = /[\u0600-\u06FF]/.test(nom)
  return (
    <span style={{ fontFamily: arab ? "'Noto Sans Arabic',sans-serif" : 'inherit', direction: arab ? 'rtl' : 'ltr', ...style }}>
      {nom}
    </span>
  )
}

export default function App() {
  const { session, profil, loading: authLoading, logout } = useAuth()
  const { annee, onglet, setOnglet, eleves, allocation, chargerAnnee, reinitialiser, dbLoading, config, setConfig } = useApp()
  const { t, langue: langueI18n, setLangue } = useI18n()

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: KAKI_DARK }}>
        <div style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Chargement…</div>
      </div>
    )
  }

  if (!session || !profil) return <PageLogin />

  const role = profil.role
  const anneeArchivee = annee?.statut === 'archivee'
  const nomsOnglets = config?.nomsOnglets || DEFAULT_CONFIG.nomsOnglets
  // Nom d'affichage : utilise nom_affichage si défini, sinon nom technique
  const nomEtab = profil.etablissements?.nom_affichage || profil.etablissements?.nom || ''
  
  const isRtl = langueI18n === 'ar'

  const tousOnglets = [
    { id: 'config_salles',    roles: ['admin', 'superadmin'] },
    { id: 'config_interface', roles: ['admin', 'superadmin'] },
    { id: 'inscriptions',     roles: ['admin', 'superadmin', 'operateur'] },
    { id: 'allocation',       roles: ['admin', 'superadmin', 'operateur'] },
    { id: 'restauration',      roles: ['admin', 'superadmin'] },
  ]
  const ongletsFiltres = tousOnglets.filter(o => o.roles.includes(role))

  return (
    <div className="app-shell" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <header className="app-header no-print" style={{ background: KAKI_DARK, minHeight: 72 }}>
        <div className="header-left">
          {annee && (
            <button onClick={reinitialiser} style={{
              background: 'rgba(255,255,255,0.18)',
              border: '2px solid rgba(255,255,255,0.5)',
              cursor: 'pointer',
              padding: '6px 16px',
              borderRadius: 8,
              marginBottom: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ fontSize: '1rem', color: 'white', fontWeight: 700 }}>
                {isRtl ? 'تغيير السنة ←' : '← Changer d\'année'}
              </span>
            </button>
          )}
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'white' }}>
            <NomEtab nom={nomEtab} />
          </div>
          {annee && (
            <div style={{ fontSize: '0.9rem', color: '#a8c070', fontWeight: 600 }}>
              {annee.label}
              {anneeArchivee && <span style={{ fontSize: '0.75rem', color: '#fbbf24', marginLeft: 8 }}>🔒 {isRtl ? 'أرشيف' : 'Archive'}</span>}
            </div>
          )}
        </div>

        <div className="header-right">
          {annee && (
            <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 500 }}>
              {eleves.length} {isRtl ? 'تلميذ' : 'élève(s)'} · {allocation ? (isRtl ? '✓ التوزيع' : '✓ Allocation') : (isRtl ? 'لم يتم التوزيع' : 'Pas d\'allocation')}
            </div>
          )}
          <div style={{ fontSize: '0.88rem', color: 'white', fontWeight: 600 }}>
            {profil.prenom} {profil.nom}
            <span style={{ marginLeft: 6, opacity: 0.65, fontWeight: 400, fontSize: '0.8rem' }}>
              · {profil.email} · ({role})
            </span>
          </div>
          {role === 'superadmin' && !annee && (
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.5)', fontWeight: 700 }}
              onClick={() => setOnglet('superadmin')}>
              ⚙ {isRtl ? 'الإدارة العامة' : 'Gestion Admin'}
            </button>
          )}
          {/* Sélecteur de langue */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 3 }}>
            <button onClick={() => { setLangue('fr'); setConfig(prev => ({ ...prev, langue: 'fr' })); window.location.reload() }}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                background: !isRtl ? 'white' : 'transparent', color: !isRtl ? KAKI_DARK : 'rgba(255,255,255,0.7)' }}>
              FR
            </button>
            <button onClick={() => { setLangue('ar'); setConfig(prev => ({ ...prev, langue: 'ar' })); window.location.reload() }}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                fontFamily: "'Noto Sans Arabic', sans-serif",
                background: isRtl ? 'white' : 'transparent', color: isRtl ? KAKI_DARK : 'rgba(255,255,255,0.7)' }}>
              ع
            </button>
          </div>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', fontWeight: 700 }}
            onClick={logout}>
            {isRtl ? 'خروج' : 'Déconnexion'}
          </button>
        </div>
      </header>

      {/* ── Superadmin sans année ── */}
      {role === 'superadmin' && !annee && onglet === 'superadmin' ? (
        <main style={{ flex: 1 }}><PageSuperAdmin /></main>
      ) : !annee ? (
        <main style={{ flex: 1 }}>
          <PageAnnees onSelectAnnee={a => {
            chargerAnnee(a, role === 'operateur' ? 'inscriptions' : 'config_salles')
          }} />
        </main>
      ) : (
        <>
          {dbLoading && (
            <div style={{ background: 'var(--accent)', color: 'white', textAlign: 'center', padding: '8px', fontSize: '0.9rem', fontWeight: 700 }} className="no-print">
              ⏳ {isRtl ? 'جاري المزامنة…' : 'Synchronisation en cours…'}
            </div>
          )}

          {/* Bannière établissement */}
          <div style={{ background: KAKI, borderBottom: '2px solid rgba(255,255,255,0.15)', padding: '7px 28px', display: 'flex', alignItems: 'center', gap: 12 }} className="no-print">
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {isRtl ? 'المؤسسة :' : 'Établissement :'}
            </span>
            <NomEtab nom={nomEtab} style={{ fontSize: '1rem', fontWeight: 700, color: '#c8e06a' }} />
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: '0.95rem', color: 'white', fontWeight: 600 }}>{annee.label}</span>
            {anneeArchivee && <span style={{ fontSize: '0.78rem', color: '#fbbf24' }}>🔒 {isRtl ? 'أرشيف' : 'Archive'}</span>}
          </div>

          {/* ── Onglets sticky ── */}
          <nav style={{ background: KAKI_DARK, display: 'flex', padding: '0 16px', gap: 4, overflowX: 'auto', borderBottom: '3px solid rgba(255,255,255,0.08)', position: 'sticky', top: '72px', zIndex: 90 }} className="no-print">
            {ongletsFiltres.map(o => {
              const nomConfig = nomsOnglets[o.id] || DEFAULT_CONFIG.nomsOnglets[o.id] || { icone: '', label: o.id }
              // Utiliser la traduction i18n si disponible
              const labelTraduit = t.onglets?.[o.id] || nomConfig.label
              const nom = { icone: nomConfig.icone, label: labelTraduit }
              const hasArabic = /[\u0600-\u06FF]/.test(nom.label)
              const isActive = onglet === o.id
              return (
                <button key={o.id} onClick={() => setOnglet(o.id)} style={{
                  padding: '14px 24px',
                  border: 'none',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer',
                  fontFamily: hasArabic ? "'Noto Sans Arabic',sans-serif" : 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  borderBottom: isActive ? '3px solid #c8e06a' : '3px solid transparent',
                  marginBottom: -3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  borderRadius: isActive ? '6px 6px 0 0' : 0,
                  direction: hasArabic ? 'rtl' : 'ltr',
                }}>
                  <span style={{ fontSize: '1.15rem' }}>{nom.icone}</span>
                  <span>{nom.label}</span>
                </button>
              )
            })}
          </nav>

          <main style={{ flex: 1 }}>
            {onglet === 'config_salles'    && <PageConfigSalles    lectureSeule={anneeArchivee || role === 'operateur'} />}
            {onglet === 'config_interface' && <PageConfigInterface  lectureSeule={anneeArchivee || role === 'operateur'} />}
            {onglet === 'inscriptions'     && <PageInscriptions     lectureSeule={anneeArchivee} nomEtab={nomEtab} anneeLabel={annee?.label} />}
            {onglet === 'allocation'       && <PageAllocation       lectureSeule={anneeArchivee} nomEtab={nomEtab} anneeLabel={annee?.label} />}
            {onglet === 'restauration'    && <PageRestauration />}
          </main>
        </>
      )}
    </div>
  )
}
