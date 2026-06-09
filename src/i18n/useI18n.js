// src/i18n/useI18n.js
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/appStore'
import fr from './fr'
import ar from './ar'

const LANGUES = { fr, ar }

// State global partagé entre tous les composants
let _langue = localStorage.getItem('app_langue') || 'fr'
const _listeners = new Set()

function setLangueGlobal(l) {
  _langue = l
  localStorage.setItem('app_langue', l)
  _listeners.forEach(fn => fn(l))
}

export function useI18n() {
  const { config } = useApp()
  const [langue, setLangueState] = useState(() => localStorage.getItem('app_langue') || config?.langue || 'fr')

  useEffect(() => {
    function onChangement(l) { setLangueState(l) }
    _listeners.add(onChangement)
    return () => _listeners.delete(onChangement)
  }, [])

  // Sync avec config Supabase si pas de préférence locale
  useEffect(() => {
    if (!localStorage.getItem('app_langue') && config?.langue) {
      setLangueState(config.langue)
    }
  }, [config?.langue])

  const t = LANGUES[langue] || fr
  const isRtl = langue === 'ar'

  const setLangue = useCallback((l) => {
    setLangueGlobal(l)
    setLangueState(l)
  }, [])

  return { t, langue, isRtl, setLangue }
}

export function interpoler(texte, vars = {}) {
  return texte.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
