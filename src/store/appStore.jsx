// src/store/appStore.jsx — Version Supabase complète
import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_CONFIG = {
  salles: [
    { id: 's1', nom: 'S1', capacite: 30 },
    { id: 's2', nom: 'S2', capacite: 12 },
    { id: 's3', nom: 'S3', capacite: 16 },
    { id: 's4', nom: 'S4', capacite: 12 },
    { id: 's5', nom: 'S5', capacite: 20 },
    { id: 's6', nom: 'S6', capacite: 28 },
  ],
  reglesAge: [
    { id: 'r1', niveauId: 'annee1', label: 'Année 1', ageMin: 6, ageMax: 6 },
    { id: 'r2', niveauId: 'annee2', label: 'Année 2', ageMin: 7, ageMax: 7 },
    { id: 'r3', niveauId: 'annee3', label: 'Année 3', ageMin: 8, ageMax: 9 },
    { id: 'r4', niveauId: 'annee4', label: 'Année 4', ageMin: 10, ageMax: 12 },
  ],
  modeCalculAge: 'annee',
  modeAllocationDefaut: 'B',
  champs: [
    { id: 'prenom',        label: 'Prénom',           type: 'text',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'nom',           label: 'Nom',               type: 'text',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'dateNaissance', label: 'Date de naissance', type: 'date',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'age',           label: 'Âge calculé',       type: 'computed', obligatoire: false, systeme: true, readonly: true  },
  ],
  // Noms des onglets — modifiables par l'admin
  nomsOnglets: {
    config_salles:    { icone: '🏫', label: 'Config. Salles' },
    config_interface: { icone: '⚙️', label: 'Config. Interface' },
    inscriptions:     { icone: '✏️', label: 'Inscriptions' },
    allocation:       { icone: '📊', label: 'Allocation' },
    export:           { icone: '📤', label: 'Export' },
  }
}

export const TEST_CONFIG = {
  salles: [
    { id: 's1', nom: 'S1', capacite: 8 },
    { id: 's2', nom: 'S2', capacite: 5 },
    { id: 's3', nom: 'S3', capacite: 6 },
  ],
  reglesAge: DEFAULT_CONFIG.reglesAge,
  modeCalculAge: 'annee',
  modeAllocationDefaut: 'B',
  champs: DEFAULT_CONFIG.champs,
  nomsOnglets: DEFAULT_CONFIG.nomsOnglets,
}

function makeDate(age) { return `${new Date().getFullYear() - age}-06-15` }

export const TEST_ELEVES = [
  { prenom: 'Léa',    nom: 'Martin',   dateNaissance: makeDate(6) },
  { prenom: 'Tom',    nom: 'Bernard',  dateNaissance: makeDate(6) },
  { prenom: 'Chloé',  nom: 'Dupont',   dateNaissance: makeDate(6) },
  { prenom: 'Hugo',   nom: 'Lefebvre', dateNaissance: makeDate(6) },
  { prenom: 'Emma',   nom: 'Moreau',   dateNaissance: makeDate(6) },
  { prenom: 'Luca',   nom: 'Simon',    dateNaissance: makeDate(6) },
  { prenom: 'Inès',   nom: 'Laurent',  dateNaissance: makeDate(6) },
  { prenom: 'Nathan', nom: 'Michel',   dateNaissance: makeDate(7) },
  { prenom: 'Zoé',    nom: 'Garcia',   dateNaissance: makeDate(7) },
  { prenom: 'Mathis', nom: 'David',    dateNaissance: makeDate(7) },
  { prenom: 'Alice',  nom: 'Bertrand', dateNaissance: makeDate(7) },
  { prenom: 'Théo',   nom: 'Thomas',   dateNaissance: makeDate(8) },
  { prenom: 'Jade',   nom: 'Petit',    dateNaissance: makeDate(8) },
  { prenom: 'Axel',   nom: 'Robert',   dateNaissance: makeDate(9) },
  { prenom: 'Lucie',  nom: 'Richard',  dateNaissance: makeDate(9) },
  { prenom: 'Romain', nom: 'Durand',   dateNaissance: makeDate(8) },
  { prenom: 'Clara',  nom: 'Leroy',    dateNaissance: makeDate(9) },
  { prenom: 'Maxime', nom: 'Morel',    dateNaissance: makeDate(10) },
  { prenom: 'Sarah',  nom: 'Fournier', dateNaissance: makeDate(11) },
  { prenom: 'Enzo',   nom: 'Girard',   dateNaissance: makeDate(12) },
  { prenom: 'Manon',  nom: 'Bonnet',   dateNaissance: makeDate(10) },
]

export function calculerAge(dateNaissance, mode = 'annee') {
  if (!dateNaissance) return null
  const a = new Date(), n = new Date(dateNaissance)
  if (isNaN(n.getTime())) return null
  if (mode === 'annee') return a.getFullYear() - n.getFullYear()
  let age = a.getFullYear() - n.getFullYear()
  if (mode === 'annee_mois') { if (a.getMonth() < n.getMonth()) age--; return age }
  if (a.getMonth() < n.getMonth() || (a.getMonth() === n.getMonth() && a.getDate() < n.getDate())) age--
  return age
}

export function determinerNiveau(age, reglesAge) {
  if (age === null || age === undefined) return null
  for (const r of reglesAge) if (age >= r.ageMin && age <= r.ageMax) return r.niveauId
  return null
}

export function optimiserAllocation(demandesParNiveau, salles, mode = 'B') {
  const niveaux = Object.keys(demandesParNiveau).filter(n => demandesParNiveau[n].length > 0)
  if (!niveaux.length || !salles.length) return { affectations: {}, score: 0 }
  let best = -1, bestAff = {}

  function sc(aff) {
    let acc = 0, cap = 0
    for (const [nId, sId] of Object.entries(aff)) {
      const s = salles.find(s => s.id === sId)
      acc += Math.min(demandesParNiveau[nId]?.length || 0, s.capacite)
      cap += s.capacite
    }
    return mode === 'A' ? (cap > 0 ? acc / cap : 0) : acc
  }

  function bt(i, rest, cur) {
    if (i === niveaux.length) { const s = sc(cur); if (s > best) { best = s; bestAff = { ...cur } }; return }
    bt(i + 1, rest, cur)
    for (const sl of rest) { cur[niveaux[i]] = sl.id; bt(i + 1, rest.filter(s => s.id !== sl.id), cur); delete cur[niveaux[i]] }
  }
  bt(0, [...salles], {})

  const res = {}
  for (const nId of niveaux) {
    const s = bestAff[nId] ? salles.find(s => s.id === bestAff[nId]) : null
    const nb = demandesParNiveau[nId].length
    const acc = s ? Math.min(nb, s.capacite) : 0
    res[nId] = { salle: s, nbDemandes: nb, acceptes: acc, refusesSalle: s ? Math.max(0, nb - s.capacite) : 0, placesLibres: s ? Math.max(0, s.capacite - nb) : 0, tauxRemplissage: s ? (acc / s.capacite * 100).toFixed(1) : 0 }
  }
  for (const nId of Object.keys(demandesParNiveau)) {
    if (!res[nId]) res[nId] = { salle: null, nbDemandes: demandesParNiveau[nId].length, acceptes: 0, refusesSalle: 0, placesLibres: 0, tauxRemplissage: 0 }
  }
  return { affectations: res, score: best }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [annee, setAnnee]           = useState(null)
  const [config, setConfigState]    = useState(DEFAULT_CONFIG)
  const [eleves, setEleves]         = useState([])
  const [allocation, setAllocation] = useState(null)
  const [modeAllocation, setModeAllocation] = useState('B')
  const [onglet, setOnglet]         = useState('config_salles')
  const [dbLoading, setDbLoading]   = useState(false)

  const chargerAnnee = useCallback(async (anneeObj) => {
    setDbLoading(true)
    setAnnee(anneeObj)
    setAllocation(null)
    setOnglet('config_salles')
    const { data: cfg } = await supabase.from('configurations').select('*').eq('annee_id', anneeObj.id).single()
    if (cfg) {
      setConfigState({
        salles: cfg.salles,
        reglesAge: cfg.regles_age,
        modeCalculAge: cfg.mode_calcul_age,
        modeAllocationDefaut: cfg.mode_allocation_defaut || 'B',
        champs: cfg.champs,
        nomsOnglets: cfg.noms_onglets || DEFAULT_CONFIG.nomsOnglets,
      })
      setModeAllocation(cfg.mode_allocation_defaut || 'B')
    } else {
      setConfigState(DEFAULT_CONFIG)
    }
    const { data: elevesData } = await supabase.from('eleves').select('*').eq('annee_id', anneeObj.id).order('date_inscription')
    setEleves((elevesData || []).map(e => ({ id: e.id, ...e.donnees, age: e.age, niveauId: e.niveau_id, statut: e.statut, force: e.force, dateInscription: e.date_inscription })))
    const { data: alloc } = await supabase.from('allocations').select('*').eq('annee_id', anneeObj.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle()
    if (alloc) setAllocation({ affectations: alloc.affectations, mode: alloc.mode, date: alloc.calculated_at })
    setDbLoading(false)
  }, [])

  const setConfig = useCallback(async (newConfig) => {
    const cfg = typeof newConfig === 'function' ? newConfig(config) : newConfig
    setConfigState(cfg)
    if (!annee) return
    await supabase.from('configurations').upsert({
      annee_id: annee.id,
      salles: cfg.salles,
      regles_age: cfg.reglesAge,
      mode_calcul_age: cfg.modeCalculAge,
      mode_allocation_defaut: cfg.modeAllocationDefaut || 'B',
      champs: cfg.champs,
      noms_onglets: cfg.nomsOnglets || DEFAULT_CONFIG.nomsOnglets,
      updated_at: new Date().toISOString()
    }, { onConflict: 'annee_id' })
  }, [annee, config])

  const ajouterEleve = useCallback(async (donnees) => {
    const age = calculerAge(donnees.dateNaissance, config.modeCalculAge)
    const niveauId = determinerNiveau(age, config.reglesAge)
    const { data, error } = await supabase.from('eleves').insert({
      annee_id: annee.id,
      etablissement_id: annee.etablissement_id,
      donnees,
      age,
      niveau_id: niveauId,
      statut: 'attente',
      force: false,
    }).select().single()
    if (error) throw error
    const el = { id: data.id, ...donnees, age, niveauId, statut: 'attente', force: false, dateInscription: data.date_inscription }
    setEleves(prev => [...prev, el])
    return el
  }, [annee, config])

  const supprimerEleve = useCallback(async (id) => {
    await supabase.from('eleves').delete().eq('id', id)
    setEleves(prev => prev.filter(e => e.id !== id))
  }, [])

  const forcerEleve = useCallback(async (id, forcer) => {
    await supabase.from('eleves').update({ force: forcer }).eq('id', id)
    setEleves(prev => prev.map(e => e.id === id ? { ...e, force: forcer } : e))
  }, [])

  const lancerOptimisation = useCallback(async (mode) => {
    const m = mode || modeAllocation
    const dpn = {}
    for (const r of config.reglesAge) {
      dpn[r.niveauId] = eleves.filter(e => e.niveauId === r.niveauId).sort((a, b) => new Date(a.dateInscription) - new Date(b.dateInscription))
    }
    const { affectations } = optimiserAllocation(dpn, config.salles, m)
    const statuts = {}
    for (const [nId, res] of Object.entries(affectations)) {
      let cnt = 0
      for (const e of (dpn[nId] || [])) {
        if (e.force) { statuts[e.id] = 'accepte'; cnt++ }
        else if (res.salle && cnt < res.salle.capacite) { statuts[e.id] = 'accepte'; cnt++ }
        else statuts[e.id] = 'liste_attente'
      }
      affectations[nId].acceptes = cnt
      affectations[nId].placesLibres = res.salle ? Math.max(0, res.salle.capacite - cnt) : 0
    }
    for (const [id, statut] of Object.entries(statuts)) await supabase.from('eleves').update({ statut }).eq('id', id)
    await supabase.from('allocations').upsert({ annee_id: annee.id, affectations, mode: m, calculated_at: new Date().toISOString() }, { onConflict: 'annee_id' })
    setEleves(prev => prev.map(e => ({ ...e, statut: statuts[e.id] || e.statut })))
    setAllocation({ affectations, mode: m, date: new Date().toISOString() })
  }, [annee, config, eleves, modeAllocation])

  const chargerDonneesTest = useCallback(async () => {
    if (!annee) return
    await setConfig(TEST_CONFIG)
    await supabase.from('eleves').delete().eq('annee_id', annee.id)
    const rows = TEST_ELEVES.map(d => {
      const age = calculerAge(d.dateNaissance, TEST_CONFIG.modeCalculAge)
      return { annee_id: annee.id, etablissement_id: annee.etablissement_id, donnees: d, age, niveau_id: determinerNiveau(age, TEST_CONFIG.reglesAge), statut: 'attente', force: false }
    })
    const { data } = await supabase.from('eleves').insert(rows).select()
    setEleves((data || []).map(e => ({ id: e.id, ...e.donnees, age: e.age, niveauId: e.niveau_id, statut: 'attente', force: false, dateInscription: e.date_inscription })))
    setAllocation(null)
  }, [annee, setConfig])

  const reinitialiser = useCallback(() => { setAnnee(null); setEleves([]); setAllocation(null); setConfigState(DEFAULT_CONFIG) }, [])

  return (
    <AppContext.Provider value={{ annee, config, setConfig, eleves, setEleves, allocation, modeAllocation, setModeAllocation, onglet, setOnglet, dbLoading, chargerAnnee, ajouterEleve, supprimerEleve, forcerEleve, lancerOptimisation, chargerDonneesTest, reinitialiser }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
