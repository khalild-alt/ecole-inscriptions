// src/i18n/useI18n.js
// Hook React pour accéder aux textes de l'interface

import { useApp } from '../store/appStore'
import fr from './fr'
import ar from './ar'

const LANGUES = { fr, ar }

export function useI18n() {
  const { config } = useApp()
  // Priorité : localStorage > config Supabase > 'fr'
  const langueStockee = typeof window !== 'undefined' ? localStorage.getItem('app_langue') : null
  const langue = langueStockee || config?.langue || 'fr'
  const t = LANGUES[langue] || fr
  const isRtl = langue === 'ar'

  function setLangue(l) {
    if (typeof window !== 'undefined') localStorage.setItem('app_langue', l)
  }

  return { t, langue, isRtl, setLangue }
}

// Utilitaire pour interpoler les variables dans les chaînes
// Exemple : interpoler('Bonjour {nom}', { nom: 'Khalil' }) → 'Bonjour Khalil'
export function interpoler(texte, vars = {}) {
  return texte.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
