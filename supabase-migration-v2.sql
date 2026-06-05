-- Migration : ajout colonnes noms_onglets et mode_allocation_defaut
-- À exécuter dans Supabase → SQL Editor → + New

ALTER TABLE public.configurations 
  ADD COLUMN IF NOT EXISTS mode_allocation_defaut text NOT NULL DEFAULT 'B' CHECK (mode_allocation_defaut IN ('A','B')),
  ADD COLUMN IF NOT EXISTS noms_onglets jsonb;

-- Valeur par défaut pour les configs existantes
UPDATE public.configurations 
SET noms_onglets = '{
  "config_salles":    {"icone": "🏫", "label": "Config. Salles"},
  "config_interface": {"icone": "⚙️", "label": "Config. Interface"},
  "inscriptions":     {"icone": "✏️", "label": "Inscriptions"},
  "allocation":       {"icone": "📊", "label": "Allocation"},
  "export":           {"icone": "📤", "label": "Export"}
}'::jsonb
WHERE noms_onglets IS NULL;
