// src/store/appStore.jsx — Version Supabase complète
import { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const DEFAULT_CONFIG = {
  salles: [
    { id: 's1', nom: 'S1', nomComplet: '', capacite: 30 },
    { id: 's2', nom: 'S2', nomComplet: '', capacite: 12 },
    { id: 's3', nom: 'S3', nomComplet: '', capacite: 16 },
    { id: 's4', nom: 'S4', nomComplet: '', capacite: 12 },
    { id: 's5', nom: 'S5', nomComplet: '', capacite: 20 },
    { id: 's6', nom: 'S6', nomComplet: '', capacite: 28 },
  ],
  reglesAge: [
    { id: 'r1', niveauId: 'annee1', label: 'Année 1', ageMin: 6, ageMax: 6 },
    { id: 'r2', niveauId: 'annee2', label: 'Année 2', ageMin: 7, ageMax: 7 },
    { id: 'r3', niveauId: 'annee3', label: 'Année 3', ageMin: 8, ageMax: 9 },
    { id: 'r4', niveauId: 'annee4', label: 'Année 4', ageMin: 10, ageMax: 12 },
  ],
  modeCalculAge: 'annee',
  modeAllocationDefaut: 'C',
  langue: 'fr',
  champs: [
    { id: 'prenom',        label: 'Prénom',           type: 'text',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'nom',           label: 'Nom',               type: 'text',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'dateNaissance', label: 'Date de naissance', type: 'date',     obligatoire: true,  systeme: true, readonly: false },
    { id: 'identifiant',   label: 'Identifiant',        type: 'number',   obligatoire: false, systeme: true, readonly: false },
    { id: 'numeroRecu',    label: 'Numéro reçu',        type: 'number',   obligatoire: false, systeme: true, readonly: false },
    { id: 'age',           label: 'Âge calculé',       type: 'computed', obligatoire: false, systeme: true, readonly: true  },
  ],
  // Terminologie — modifiable par l'admin
  terminologie: {
    groupe: 'Groupe',
    annee: 'Année',
  },
  // Noms des onglets — modifiables par l'admin
  nomsOnglets: {
    config_salles:    { icone: '🏫', label: 'Config. Salles' },
    config_interface: { icone: '⚙️', label: 'Config. Interface' },
    inscriptions:     { icone: '✏️', label: 'Inscriptions' },
    allocation:       { icone: '📊', label: 'Allocation' },
    export:           { icone: '📤', label: 'Export' },
    restauration:     { icone: '♻️', label: 'Restauration' },
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
  modeAllocationDefaut: 'C',
  langue: 'fr',
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

export function optimiserAllocation(demandesParNiveau, salles) {
  // Algorithme multi-classes : toutes les salles utilisées, min 1 salle par niveau
  // Maximise le nombre d'élèves acceptés avec 100% de remplissage si possible
  const niveaux = Object.keys(demandesParNiveau).filter(n => demandesParNiveau[n].length > 0)
  if (!niveaux.length || !salles.length) return { affectations: {}, score: 0 }

  const sallesSorted = [...salles].sort((a, b) => b.capacite - a.capacite)
  const niveauxTriesDesc = [...niveaux].sort((a, b) => demandesParNiveau[b].length - demandesParNiveau[a].length)

  // Phase 1 : garantir 1 salle par niveau (priorité aux niveaux les plus peuplés)
  const sallesRestantes = [...sallesSorted]
  const assignationInitiale = {}
  niveaux.forEach(n => assignationInitiale[n] = [])
  for (const n of niveauxTriesDesc) {
    if (sallesRestantes.length > 0) assignationInitiale[n].push(sallesRestantes.shift())
  }

  // Phase 2 : backtracking sur les salles restantes
  function scoreDistrib(distrib) {
    return niveaux.reduce((s, n) => {
      const cap = distrib[n].reduce((c, sl) => c + sl.capacite, 0)
      return s + Math.min(demandesParNiveau[n].length, cap)
    }, 0)
  }

  let meilleurScore = -1
  let meilleureDistrib = null

  function backtrack(idx, distrib) {
    if (idx === sallesRestantes.length) {
      const s = scoreDistrib(distrib)
      if (s > meilleurScore) {
        meilleurScore = s
        meilleureDistrib = {}
        niveaux.forEach(n => meilleureDistrib[n] = [...distrib[n]])
      }
      return
    }
    const salle = sallesRestantes[idx]
    for (const n of niveaux) {
      distrib[n].push(salle)
      backtrack(idx + 1, distrib)
      distrib[n].pop()
    }
  }

  const distribBT = {}
  niveaux.forEach(n => distribBT[n] = [...assignationInitiale[n]])
  backtrack(0, distribBT)

  // Construire le résultat avec classes
  const affectations = {}
  for (const niveauId of niveaux) {
    const elevesNiveau = demandesParNiveau[niveauId]
    const sallesNiveau = (meilleureDistrib[niveauId] || []).sort((a, b) => b.capacite - a.capacite)
    const classes = []
    let elevesRestants = [...elevesNiveau]

    for (let i = 0; i < sallesNiveau.length; i++) {
      const salle = sallesNiveau[i]
      const elevesClasse = elevesRestants.splice(0, salle.capacite)
      classes.push({
        classeNum: i + 1,
        classeId: `${niveauId}_c${i+1}`,
        salle,
        nbAcceptes: elevesClasse.length,
        placesLibres: salle.capacite - elevesClasse.length,
        tauxRemplissage: ((elevesClasse.length / salle.capacite) * 100).toFixed(1),
        elevesIds: elevesClasse.map(e => e.id),
      })
    }

    affectations[niveauId] = {
      classes,
      nbDemandes: elevesNiveau.length,
      nbAcceptes: elevesNiveau.length - elevesRestants.length,
      nbAttente: elevesRestants.length,
      placesTotales: sallesNiveau.reduce((s, sl) => s + sl.capacite, 0),
      elevesAttenteIds: elevesRestants.map(e => e.id),
      // Compat ancienne interface
      salle: sallesNiveau[0] || null,
      acceptes: elevesNiveau.length - elevesRestants.length,
      refusesSalle: 0,
      placesLibres: sallesNiveau.reduce((s, sl) => s + sl.capacite, 0) - (elevesNiveau.length - elevesRestants.length),
      tauxRemplissage: sallesNiveau.length > 0
        ? ((elevesNiveau.length - elevesRestants.length) / sallesNiveau.reduce((s, sl) => s + sl.capacite, 0) * 100).toFixed(1)
        : 0,
    }
  }

  return { affectations, score: meilleurScore }
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

  const chargerAnnee = useCallback(async (anneeObj, ongletInitial) => {
    setDbLoading(true)
    setAnnee(anneeObj)
    setAllocation(null)
    if (ongletInitial) setOnglet(ongletInitial)
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
    setEleves((elevesData || [])
      .map(e => ({ id: e.id, ...e.donnees, age: e.age, niveauId: e.niveau_id, statut: e.statut, force: e.force, dateInscription: e.date_inscription }))
      .sort((a, b) => {
        // Trier par _ordre si disponible, sinon par dateInscription
        if (a._ordre !== undefined && b._ordre !== undefined) return a._ordre - b._ordre
        return new Date(a.dateInscription) - new Date(b.dateInscription)
      }))
    const { data: alloc } = await supabase.from('allocations').select('*').eq('annee_id', anneeObj.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle()
    if (alloc) setAllocation({ affectations: alloc.affectations, mode: alloc.mode, date: alloc.calculated_at, groupesFiges: alloc.groupes_figes || [] })
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
      terminologie: cfg.terminologie || DEFAULT_CONFIG.terminologie,
      langue: cfg.langue || 'fr',
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

  // Insert batch ordonné — respecte l'ordre du tableau via champ _ordre dans donnees
  const ajouterElevesBatch = useCallback(async (listeDonnees) => {
    const rows = listeDonnees.map((donnees, idx) => {
      const age = calculerAge(donnees.dateNaissance, config.modeCalculAge)
      const niveauId = determinerNiveau(age, config.reglesAge)
      // Stocker l'ordre d'import dans les données
      const donneesAvecOrdre = { ...donnees, _ordre: idx }
      return { annee_id: annee.id, etablissement_id: annee.etablissement_id, donnees: donneesAvecOrdre, age, niveau_id: niveauId, statut: 'attente', force: false }
    })
    const { data, error } = await supabase.from('eleves').insert(rows).select()
    if (error) throw error
    // Trier par _ordre pour garantir l'ordre d'import
    const nouveaux = (data || [])
      .map(e => ({ id: e.id, ...e.donnees, age: e.age, niveauId: e.niveau_id, statut: 'attente', force: false, dateInscription: e.date_inscription }))
      .sort((a, b) => (a._ordre ?? 0) - (b._ordre ?? 0))
    setEleves(prev => [...prev, ...nouveaux])
    return nouveaux
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
    const dpn = {}
    for (const r of config.reglesAge) {
      dpn[r.niveauId] = eleves.filter(e => e.niveauId === r.niveauId).sort((a, b) => new Date(a.dateInscription) - new Date(b.dateInscription))
    }
    const { affectations } = optimiserAllocation(dpn, config.salles, config.modeAllocationDefaut || 'C')

    // Calculer les statuts à partir des classes
    const statuts = {}
    for (const [nId, res] of Object.entries(affectations)) {
      const elevesNiveau = dpn[nId] || []
      // D'abord les forcés
      const forces = elevesNiveau.filter(e => e.force)
      const normaux = elevesNiveau.filter(e => !e.force)

      // Capacité totale du niveau
      const capaciteTotale = res.classes.reduce((s, c) => s + c.salle.capacite, 0)
      let placesRestantes = capaciteTotale

      // Forcer en priorité
      for (const e of forces) {
        statuts[e.id] = 'accepte'
        placesRestantes--
      }
      // Puis premiers arrivés
      for (const e of normaux) {
        if (placesRestantes > 0) { statuts[e.id] = 'accepte'; placesRestantes-- }
        else statuts[e.id] = 'liste_attente'
      }

      // Recalculer nbAcceptes
      const nbAcc = elevesNiveau.filter(e => statuts[e.id] === 'accepte').length
      affectations[nId].nbAcceptes = nbAcc
      affectations[nId].acceptes = nbAcc
      affectations[nId].nbAttente = elevesNiveau.length - nbAcc
      affectations[nId].placesLibres = Math.max(0, capaciteTotale - nbAcc)
    }

    for (const [id, statut] of Object.entries(statuts)) await supabase.from('eleves').update({ statut }).eq('id', id)
    await supabase.from('allocations').upsert({ annee_id: annee.id, affectations, mode: 'multi', calculated_at: new Date().toISOString() }, { onConflict: 'annee_id' })
    setEleves(prev => prev.map(e => ({ ...e, statut: statuts[e.id] || e.statut })))
    setAllocation({ affectations, mode: 'multi', date: new Date().toISOString() })
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

  // ── Créer une sauvegarde manuelle ──
  const creerSauvegarde = useCallback(async (declencheur = 'manuel') => {
    if (!annee || eleves.length === 0) return
    const { data: existantes } = await supabase
      .from('sauvegardes_eleves').select('id').eq('annee_id', annee.id)
      .order('created_at', { ascending: false })
    if (existantes && existantes.length >= 20) {
      const aSupprimer = existantes.slice(19).map(s => s.id)
      await supabase.from('sauvegardes_eleves').delete().in('id', aSupprimer)
    }
    const donnees = eleves.map(e => ({
      donnees: Object.fromEntries(Object.entries(e).filter(([k]) => !['id','age','niveauId','statut','force','dateInscription'].includes(k))),
      age: e.age, niveauId: e.niveauId,
    }))
    await supabase.from('sauvegardes_eleves').insert({
      annee_id: annee.id, etablissement_id: annee.etablissement_id,
      donnees, nb_eleves: eleves.length, declencheur,
    })
  }, [annee, eleves])

  // ── Effacer toutes les inscriptions ──
  const effacerToutesInscriptions = useCallback(async () => {
    if (!annee) return
    try { await creerSauvegarde('avant_effacement') } catch(e) {}
    await supabase.from('eleves').delete().eq('annee_id', annee.id)
    await supabase.from('allocations').delete().eq('annee_id', annee.id)
    setEleves([])
    setAllocation(null)
  }, [annee, creerSauvegarde])

  // ── incrementerModifs (no-op simplifié) ──
  const incrementerModifs = useCallback(async () => {}, [])

  return (
    <AppContext.Provider value={{ annee, config, setConfig, eleves, setEleves, allocation, setAllocation, modeAllocation, setModeAllocation, onglet, setOnglet, dbLoading, chargerAnnee, ajouterEleve, ajouterElevesBatch, supprimerEleve, forcerEleve, lancerOptimisation, chargerDonneesTest, reinitialiser, creerSauvegarde, effacerToutesInscriptions, incrementerModifs }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() { return useContext(AppContext) }
