# Guide de déploiement — Inscriptions Scolaires
## Supabase + GitHub + Netlify

---

## ÉTAPE 1 — Initialiser la base de données Supabase

1. Ouvrir **https://supabase.com** → ton projet "Sfax"
2. Menu gauche → icône **SQL Editor** (symbole `>_`)
3. Cliquer **"New query"**
4. Copier-coller **tout le contenu** du fichier `supabase-schema.sql`
5. Cliquer **"Run"** (bouton vert)
6. Vérifier que le message "Success" apparaît en bas

---

## ÉTAPE 2 — Créer ton compte superadmin

1. Dans Supabase → menu gauche → **Authentication** → **Users**
2. Cliquer **"Add user"** → **"Create new user"**
3. Remplir :
   - Email : `khalil.drira@gmail.com`
   - Password : (choisis un mot de passe)
   - Cocher **"Auto Confirm User"**
4. Cliquer **"Create User"**
5. Note l'**UUID** qui apparaît dans la liste (format : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

6. Retourner dans **SQL Editor** → **New query** et exécuter :

```sql
INSERT INTO public.profils (id, email, nom, prenom, role)
VALUES (
  'COLLER-TON-UUID-ICI',
  'khalil.drira@gmail.com',
  'Drira',
  'Khalil',
  'superadmin'
)
ON CONFLICT (id) DO UPDATE SET role = 'superadmin';
```

*(Remplace `COLLER-TON-UUID-ICI` par l'UUID copié)*

---

## ÉTAPE 3 — Pousser le code sur GitHub

### Si tu n'as pas encore de dépôt :

1. Ouvrir **https://github.com** → bouton **"+"** → **"New repository"**
2. Nom : `ecole-inscriptions`
3. Visibilité : **Private**
4. Cliquer **"Create repository"**

### Sur ton Mac, dans un terminal :

```bash
# Aller dans le dossier du projet
cd /chemin/vers/ecole-inscriptions-v2

# Initialiser git
git init
git add .
git commit -m "Initial commit"

# Connecter à GitHub (remplace TON-USERNAME)
git remote add origin https://github.com/TON-USERNAME/ecole-inscriptions.git
git branch -M main
git push -u origin main
```

*(Si Git demande tes identifiants GitHub, utilise ton email et un "Personal Access Token" créé sur GitHub → Settings → Developer settings → Tokens)*

---

## ÉTAPE 4 — Déployer sur Netlify

1. Ouvrir **https://app.netlify.com**
2. Cliquer **"Add new site"** → **"Import an existing project"**
3. Cliquer **"GitHub"** → autoriser Netlify
4. Sélectionner le dépôt `ecole-inscriptions`
5. Paramètres de build :
   - **Build command** : `npm run build`
   - **Publish directory** : `dist`
6. Cliquer **"Add environment variables"** (important !) :
   - Clé : `VITE_SUPABASE_URL`
   - Valeur : `https://oolimrhayjbshuwsyzqc.supabase.co`
   - Ajouter une 2e variable :
   - Clé : `VITE_SUPABASE_ANON_KEY`
   - Valeur : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbGltcmhheWpic2h1d3N5enFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MTYxMDIsImV4cCI6MjA5NTI5MjEwMn0.t2cqZFqH58TU6iHNr9tgXp3Y04xCe62_9OolfbE2kcs`
7. Cliquer **"Deploy site"**
8. Attendre 2-3 minutes → ton site sera sur une URL type `https://amazing-name-123.netlify.app`

---

## ÉTAPE 5 — Configurer Supabase pour autoriser ton domaine Netlify

1. Dans Supabase → **Authentication** → **URL Configuration**
2. Dans **"Site URL"** : mettre ton URL Netlify (ex: `https://amazing-name-123.netlify.app`)
3. Dans **"Redirect URLs"** : ajouter `https://amazing-name-123.netlify.app/**`
4. Sauvegarder

---

## ÉTAPE 6 — Premier accès et utilisation

1. Ouvrir ton URL Netlify dans le navigateur
2. Se connecter avec `khalil.drira@gmail.com` et le mot de passe créé à l'étape 2
3. Tu es superadmin → tu verras le bouton **"⚙ Admin"** en haut à droite
4. Créer un établissement via l'interface
5. Créer les comptes admin et opérateurs
6. Les utilisateurs se connectent sur la même URL avec leurs propres identifiants

---

## Déploiements futurs (mises à jour)

Chaque fois que je te donne un fichier modifié :

```bash
cd /chemin/vers/ecole-inscriptions-v2
git add .
git commit -m "Description de la modification"
git push
```

Netlify redéploie automatiquement en 2-3 minutes.

---

## En cas de problème

**Erreur de connexion** : Vérifier les URL dans Supabase → Authentication → URL Configuration

**"Permission denied"** : Le schéma SQL n'a pas été exécuté correctement → relancer l'étape 1

**Page blanche** : Ouvrir les outils développeur (F12) → Console → copier l'erreur et me la transmettre
