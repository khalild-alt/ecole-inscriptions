// src/pages/PageRestauration.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../store/appStore'
import { useToast } from '../components/Toast'
import { useI18n } from '../i18n/useI18n'

export default function PageRestauration() {
  const { annee, eleves, setEleves, setAllocation } = useApp()
  const { t, langue } = useI18n()
  const toast = useToast()
  const [sauvegardes, setSauvegardes] = useState([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(null)

  async function charger() {
    setLoading(true)
    const { data } = await supabase
      .from('sauvegardes_eleves')
      .select('id, nb_eleves, declencheur, created_at')
      .eq('annee_id', annee.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setSauvegardes(data || [])
    setLoading(false)
  }

  useEffect(() => { if (annee) charger() }, [annee])

  async function restaurer(sauvegarde) {
    if (!window.confirm(
      langue === 'ar'
        ? `استعادة النسخة المحفوظة بتاريخ ${new Date(sauvegarde.created_at).toLocaleString('fr-FR')} ؟\n\nسيتم استبدال قائمة التلاميذ الحالية.`
        : `Restaurer la sauvegarde du ${new Date(sauvegarde.created_at).toLocaleString('fr-FR')} ?\n\nCela remplacera la liste actuelle des élèves.`
    )) return

    setRestoring(sauvegarde.id)
    try {
      // Charger les données complètes
      const { data: sv } = await supabase
        .from('sauvegardes_eleves')
        .select('donnees')
        .eq('id', sauvegarde.id)
        .single()

      if (!sv) { toast('Sauvegarde introuvable', 'error'); return }

      // Supprimer les élèves actuels
      await supabase.from('eleves').delete().eq('annee_id', annee.id)

      // Réinsérer les élèves sauvegardés
      if (sv.donnees && sv.donnees.length > 0) {
        const rows = sv.donnees.map(e => ({
          annee_id: annee.id,
          etablissement_id: annee.etablissement_id,
          donnees: e.donnees,
          age: e.age,
          niveau_id: e.niveauId,
          statut: 'attente',
          force: false,
        }))
        const { data: inserted } = await supabase.from('eleves').insert(rows).select()
        setEleves((inserted || []).map(e => ({
          id: e.id, ...e.donnees, age: e.age, niveauId: e.niveau_id,
          statut: 'attente', force: false, dateInscription: e.date_inscription,
        })))
      } else {
        setEleves([])
      }

      // Réinitialiser l'allocation
      await supabase.from('allocations').delete().eq('annee_id', annee.id)
      setAllocation(null)

      toast(langue === 'ar' ? 'تمت الاستعادة بنجاح' : 'Restauration effectuée', 'success')
    } catch (err) {
      toast('Erreur : ' + err.message, 'error')
    }
    setRestoring(null)
  }

  async function supprimerSauvegarde(id) {
    if (!window.confirm(langue === 'ar' ? 'حذف هذه النسخة ؟' : 'Supprimer cette sauvegarde ?')) return
    await supabase.from('sauvegardes_eleves').delete().eq('id', id)
    toast(langue === 'ar' ? 'تم الحذف' : 'Supprimée', 'info')
    charger()
  }

  const declencheurLabel = (d) => {
    if (langue === 'ar') {
      if (d === 'manuel') return '💾 يدوي'
      if (d === 'avant_effacement') return '🗑 قبل الحذف'
      return '⚙ تلقائي'
    }
    if (d === 'manuel') return '💾 Manuel'
    if (d === 'avant_effacement') return '🗑 Avant effacement'
    return '⚙ Auto'
  }

  const declencheurColor = (d) => {
    if (d === 'avant_effacement') return 'var(--danger)'
    if (d === 'manuel') return 'var(--info)'
    return 'var(--ink-muted)'
  }

  return (
    <div className="page">
      <h2 className="page-title">{langue === 'ar' ? 'استعادة التسجيلات' : 'Restauration des inscriptions'}</h2>
      <p className="page-subtitle">
        {langue === 'ar'
          ? 'اختر نسخة احتياطية لاستعادتها. تُحفظ آخر 20 نسخة.'
          : 'Choisissez une sauvegarde à restaurer. Les 20 dernières versions sont conservées.'}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
          {langue === 'ar' ? 'جاري التحميل…' : 'Chargement…'}
        </div>
      ) : sauvegardes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📂</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--ink-muted)' }}>
            {langue === 'ar' ? 'لا توجد نسخ احتياطية' : 'Aucune sauvegarde disponible'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: 8 }}>
            {langue === 'ar'
              ? 'يتم الحفظ تلقائياً كل 10 تعديلات أو عند الحذف اليدوي.'
              : 'Les sauvegardes se créent automatiquement toutes les 10 modifications ou avant un effacement.'}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            📂 {langue === 'ar' ? 'النسخ الاحتياطية المتاحة' : 'Sauvegardes disponibles'} ({sauvegardes.length})
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{langue === 'ar' ? 'التاريخ والوقت' : 'Date et heure'}</th>
                  <th>{langue === 'ar' ? 'عدد التلاميذ' : 'Nb élèves'}</th>
                  <th>{langue === 'ar' ? 'النوع' : 'Type'}</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {sauvegardes.map(sv => (
                  <tr key={sv.id}>
                    <td>
                      <strong>{new Date(sv.created_at).toLocaleDateString('fr-FR')}</strong>
                      <span style={{ marginLeft: 8, color: 'var(--ink-muted)', fontSize: '0.85rem' }}>
                        {new Date(sv.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info">{sv.nb_eleves} {langue === 'ar' ? 'تلميذ' : 'élève(s)'}</span>
                    </td>
                    <td>
                      <span style={{ color: declencheurColor(sv.declencheur), fontWeight: 600, fontSize: '0.85rem' }}>
                        {declencheurLabel(sv.declencheur)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => restaurer(sv)}
                          disabled={restoring === sv.id}
                        >
                          {restoring === sv.id
                            ? (langue === 'ar' ? 'جاري…' : 'Restauration…')
                            : (langue === 'ar' ? '↩ استعادة' : '↩ Restaurer')
                          }
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => supprimerSauvegarde(sv.id)}>
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: 16 }}>
        {langue === 'ar'
          ? '⚠️ الاستعادة تستبدل قائمة التلاميذ الحالية وتلغي التوزيع المحسوب.'
          : '⚠️ La restauration remplace la liste actuelle des élèves et réinitialise l\'allocation calculée.'}
      </div>
    </div>
  )
}
