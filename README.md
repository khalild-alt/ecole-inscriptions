# Gestion des Inscriptions Scolaires

Application web locale pour gérer les inscriptions scolaires et optimiser l'allocation des salles.

## Prérequis

- **Node.js** version 18 ou supérieure
  - Vérifier : `node --version`
  - Télécharger si besoin : https://nodejs.org

## Installation et lancement

### 1. Ouvrir un terminal dans ce dossier

**Mac :**
- Finder → dossier `ecole-inscriptions` → clic droit → "Nouveau terminal au dossier"
- Ou Terminal : `cd /chemin/vers/ecole-inscriptions`

**Windows :**
- Explorer → dossier `ecole-inscriptions` → barre d'adresse → taper `cmd` → Entrée
- Ou PowerShell : `cd C:\chemin\vers\ecole-inscriptions`

### 2. Installer les dépendances (une seule fois)

```bash
npm install
```

### 3. Lancer l'application

```bash
npm run dev
```

L'application s'ouvre automatiquement sur **http://localhost:5173**

## Utilisation rapide

1. **Configuration** : Paramétrez vos salles, règles d'âge et champs de formulaire
2. **Inscriptions** : Saisissez les élèves un par un ou importez un fichier Excel
3. **Allocation** : Calculez l'affectation optimale des salles (Mode B par défaut)
4. **Export** : Téléchargez les résultats en Excel ou PDF

## Données de test

Dans l'onglet **Configuration**, cliquez sur **"Charger données de test"** pour injecter un jeu de données vérifiable :
- 3 salles : S1=8, S2=5, S3=6 (total 19 places)
- 21 élèves répartis sur 4 niveaux

**Résultat attendu (Mode B) :**
- Année 1 (7 élèves, 6 ans) → S1 (8) = 87.5% — 7 acceptés, 1 place libre
- Année 2 (4 élèves, 7 ans) → S2 (5) = 80% — 4 acceptés, 1 place libre
- Année 3 (6 élèves, 8-9 ans) → S3 (6) = 100% — 6 acceptés, 0 place libre
- Année 4 (5 élèves, 10-12 ans) → Aucune salle disponible → 5 en liste d'attente

## Arrêter l'application

Dans le terminal : `Ctrl + C`
