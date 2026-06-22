# START HERE — Construire TRADE avec Claude Code

Guide pas-à-pas pour Samyel. Tout est gratuit au début. Suis les blocs dans l'ordre.
Le dossier de travail est `~/Documents/TRADE/app-code/` (ce dossier contient déjà `CLAUDE.md` + `TRADE_SPECS.md`).

---

## 0. Une seule fois : installer les outils

Ouvre **Terminal** (Cmd+Espace → tape "Terminal" → Entrée).

```bash
# 1. Vérifie Node.js (il faut v18+)
node -v
# Si "command not found" → installe depuis https://nodejs.org (version LTS), puis rouvre le Terminal.

# 2. Installe Claude Code
npm install -g @anthropic-ai/claude-code
```

---

## 1. Lancer Claude Code dans le projet

```bash
cd ~/Documents/TRADE/app-code
claude
```

La première fois, ça ouvre ton navigateur pour te connecter avec ton compte Claude (ton abonnement actuel suffit, pas besoin de payer l'API).

Claude Code lit **automatiquement** `CLAUDE.md` à chaque message → il connaît déjà la stack, les couleurs, la méthode.

---

## 2. Le rythme de travail (la partie la plus importante)

Tu avances **un écran à la fois**. Pour chaque étape :

1. Tu donnes un prompt court (voir exemples plus bas).
2. Claude code l'écran et lance le serveur.
3. Tu ouvres `http://localhost:3000` dans ton navigateur et tu regardes.
4. Tu dis ce qui ne va pas ("le jaune est trop pâle", "le bouton doit être plus bas") → il corrige.
5. Quand c'est bon : tu dis "commit" → il sauvegarde dans git.
6. Étape suivante.

Ne demande jamais "construis toute l'app". Ça part en vrille et tu ne peux rien valider.

---

## 3. Premiers prompts à copier-coller

**Prompt 1 — Setup (étape 1) :**
```
Lis CLAUDE.md et TRADE_SPECS.md. Crée le projet Next.js + TypeScript + Tailwind
dans ce dossier, configure les design tokens TRADE, et fais un layout mobile-first
vide avec le fond crème. Lance le serveur de dev. Arrête-toi là, je veux valider
avant qu'on continue.
```

**Prompt 2 — Premier écran réel :**
```
Construis l'écran "Get Started" en reproduisant fidèlement le design dans
~/Documents/TRADE/app/pdf/Trade_V1.pdf (première page). Utilise le logo
~/Documents/TRADE/logo/TRADE_MAIN_LOGO.png. Montre-moi le résultat.
```

**Prompt 3 — quand un écran te plaît :**
```
Parfait. Commit avec un message clair, puis passe à l'écran suivant de la section 14.
```

**Pour configurer GitHub (sauvegarde du code) :**
```
Configure git dans ce projet et crée un repo GitHub privé "trade-app".
Guide-moi si tu as besoin que je me connecte à GitHub.
```

---

## 4. Comptes à créer en chemin (tous gratuits au début)

| Quand | Service | Pourquoi |
|---|---|---|
| Tout de suite | **GitHub** (github.com) | sauvegarder le code |
| Étape 2 (auth/DB) | **Supabase** (supabase.com) | comptes, base de données, upload photos |
| Quand tu veux une URL publique | **Vercel** (vercel.com) | mettre l'app en ligne |
| Étape 9 (paiements) | **Stripe** (stripe.com) | achat de coins |

Quand tu arrives à Supabase/Stripe, demande simplement à Claude Code :
"Guide-moi pour créer le projet Supabase et brancher les clés" → il te dit exactement où cliquer.

---

## 5. Réflexes utiles

- **Bloqué / erreur rouge ?** Copie-colle le message d'erreur à Claude Code, il debug.
- **Tu veux repartir en arrière ?** Comme on commit à chaque écran, demande "reviens au dernier commit".
- **Un écran Figma manque ?** (login, chat, profil public, achat coins, settings…) → ton cofondateur les designe d'abord dans Figma. En attendant, Claude Code peut faire une version provisoire marquée TODO.
- **Voir l'app sur ton téléphone** pendant le dev : demande "expose le serveur en réseau local", il te donne une adresse à ouvrir sur ton mobile (même wifi).

---

## 6. Ordre complet (rappel, détaillé dans specs §14)

1. Setup + tokens · 2. Auth + onboarding · 3. Upload item · 4. Admin validation ·
5. Feed swipe + favoris · 6. Détail + trade flow + escrow · 7. Chat temps réel ·
8. Confirmation + rating · 9. Stripe coins · 10. Settings + légal · 11. Déploiement Vercel

Vise à finir **étapes 1 à 5** comme premier vrai jalon (app navigable avec comptes et feed).
Tout le reste vient après. Bon build.
