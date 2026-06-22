# TRADE — Spécifications MVP v1

> Document de référence pour le développement avec Claude Code.
> Décisions validées par Samyel le 12/06/2026.

---

## 1. Vision & objectif

TRADE est une webapp de kledingruil (échange de vêtements) sans transaction d'argent entre users, basée sur un système hybride troc + coins. Objectif de cette version : **un vrai MVP en production**, avec vrais comptes, vrais échanges et monétisation dès le lancement.

- **Plateforme** : webapp mobile-first (Next.js), architecture pensée pour migrer vers app native (React Native) plus tard
- **Langue** : anglais uniquement
- **Cible** : étudiants & jeunes adultes, lancement à Bruxelles
- **Tagline** : "Swap, don't shop."

## 2. Stack technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind CSS | Mobile-first, rapide, gratuit sur Vercel |
| Backend/DB | Supabase (Postgres, Auth, Storage, Realtime) | Auth Google + email inclus, gratuit au début |
| Paiements | Stripe | Achat de coins + service fees |
| Hébergement | Vercel | Gratuit, URL publique immédiate |
| Versioning | GitHub | Collaboration à deux |

## 3. Design system

Source : dossier `/Users/SamyelCrokaert/Documents/TRADE/` (screens dans `app/pdf/Trade_V1.pdf`, brand dans `brand identity/`, photos dans `photo's brand/` et `app/images/`).

- Primary : `#FFC543` (jaune)
- Background : `#F9F4E8` (crème)
- Dark text : `#2A2A2A`
- Eco accent : `#7A8F58` (vert)
- Warm accent : `#D97A3A` (orange)
- Vibe : warm, clean, minimal, Gen Z, eco
- Éléments graphiques : scribbles/markers (dossier `app/marker/`), icône coins (dossier `app/Coins/`)

**Règle** : les écrans existants dans Trade_V1 sont la référence exacte. Les écrans manquants (voir §11) seront designés par le co-fondateur dans Figma AVANT d'être codés.

## 4. Comptes & profils

### Auth (Supabase Auth)
- Google login (principal)
- Email + mot de passe (fallback)
- Âge minimum 16 ans : checkbox à l'inscription + acceptation Terms of Service & Privacy Policy (RGPD)

### Profil utilisateur
- Pseudo, photo de profil, localisation approximative (ville)
- Tailles : haut, bas, chaussures
- Style preferences : streetwear, vintage, minimal, open (cf. écran onboarding)
- Rating moyen + reviews reçues (débloqué après chaque échange confirmé)

### Localisation
- GPS du navigateur (permission demandée), fallback saisie code postal si refus
- Stockage : lat/lng approximatif, jamais l'adresse exacte

## 5. Items (vêtements)

### Upload — format rapide (~60 sec)
Champs obligatoires :
- Photos : 1 à 4
- Titre
- Catégorie : jackets, shirts, shoes, pants (+ extensible)
- Taille
- Condition : new, like new, used, worn
- Prix en coins : **suggéré par l'app** (fourchette selon catégorie + condition), ajustable par le proprio

### Cycle de vie d'un item
`draft → pending_review → active → reserved → traded` (ou `rejected` / `removed`)

- **Validation manuelle** : chaque item passe par le dashboard admin avant publication
- **Filtre auto** : API de détection de contenu inapproprié sur les photos à l'upload (avant même la review manuelle)

## 6. Feed & swipe

- Feed = items `active` dans le rayon de l'user, filtrés automatiquement par ses tailles et styles
- Rayon réglable par l'user : slider 1–50 km, défaut 10 km
- Carte item : grande photo, titre, taille, condition, distance
- Actions : swipe gauche = skip, swipe droite = interested, bouton save (favoris)
- "Interested" → ouvre les deux modes d'échange (§7)

## 7. Échanges — "Two ways to swap"

### Mode A — Achat direct en coins
1. User B veut l'item de User A → paie le prix en coins
2. Coins bloqués en escrow
3. Chat ouvert pour convenir de la remise
4. Double confirmation → coins transférés à A

### Mode B — Troc + complément coins
1. User B propose : un de ses items (+ éventuellement des coins pour équilibrer)
2. User A accepte ou refuse
3. Si accepté → coins éventuels en escrow, chat ouvert
4. Double confirmation → transfert

### Confirmation d'échange
- Les DEUX users confirment dans l'app que l'échange a eu lieu
- Avant double confirmation : coins en escrow, items en statut `reserved`
- Après : coins transférés, items `traded`, rating mutuel débloqué
- Annulation possible tant que pas de double confirmation → escrow remboursé, items redeviennent `active`

### Remise
- **Rencontre locale** (convenue via chat) — mode principal au lancement
- **Points relais friperies partenaires** — phase 2 (lien stratégie thrift stores)

## 8. Économie des coins

### Gagner des coins
- Quelqu'un prend un de tes items (mode A) → tu reçois le prix en coins
- Upload d'items : petit bonus par item publié (validé), avec limite anti-abus (ex. max 5 items bonus)
- Parrainage : bonus quand un filleul s'inscrit ET réalise son premier échange (anti-abus)
- PAS de bonus d'inscription sec

### Dépenser des coins
- Acheter des items (mode A) ou compléter un troc (mode B)

### Monétisation (dès le lancement)
- **Achat de coins** avec argent réel via Stripe (packs, ex. 100 coins = €X)
- **Service fee** : ~€1 par échange conclu — à appliquer sur les transactions appropriées (à préciser : sur achat de coins, sur confirmation, ou sur envoi postal phase 2)

⚠️ Point d'attention légal : coins achetables = monnaie virtuelle → vérifier obligations (remboursement, TVA, KYC léger) avant le lancement public.

## 9. Chat & notifications

- Chat texte simple, temps réel (Supabase Realtime), ouvert uniquement après accord d'échange
- Notifications **in-app** uniquement au lancement (cloche : nouvelle offre, offre acceptée, message, confirmation)
- Blocage et signalement d'un user depuis le chat/profil

## 10. Modération & admin

### Dashboard admin (simple, accès réservé aux 2 fondateurs)
- File de validation des items (approve/reject avec raison)
- File des signalements (items + users)
- Stats de base : users, items, échanges, coins en circulation
- Actions : retirer un item, suspendre un user

### Modération
- Filtre auto photos à l'upload
- Validation manuelle avant publication
- Bouton report sur items, profils, messages

## 11. Écrans

### Existants (Figma — référence exacte)
1. Get Started / intro
2. How does it work
3. Onboarding : type de vêtements
4. Onboarding : looking for
5. Feed swipe (main page)
6. Détail item
7. Trade details (ton item vs le sien)
8. Wallet / coins

### À designer par le co-fondateur AVANT dev
1. Login / signup (Google + email, checkbox 16+)
2. Création / édition de profil (tailles, styles, photo)
3. Profil public d'un user (items, rating, reviews)
4. Upload item (flow complet, partiellement dans le dossier)
5. Chat (liste conversations + conversation)
6. Flow d'offre mode B (proposer item + coins)
7. Confirmation d'échange + rating
8. Achat de coins (packs, checkout Stripe)
9. Settings (compte, rayon, notifications, légal)
10. Favoris / saved items
11. Dashboard admin (peut être fonctionnel sans design poussé)
12. États vides & erreurs (pas d'items dans le rayon, etc.)

## 12. Modèle de données (Supabase)

- `users` : id, pseudo, avatar_url, lat/lng, ville, tailles (jsonb), styles (array), rating_avg, coins_balance, referral_code, created_at
- `items` : id, owner_id, title, category, size, condition, price_coins, photos (array), status, lat/lng, created_at
- `swipes` : user_id, item_id, direction, created_at
- `saves` : user_id, item_id
- `trades` : id, type (direct/barter), buyer_id, seller_id, item_id, offered_item_id (nullable), coins_amount, status (proposed/accepted/confirmed_one/completed/cancelled), created_at
- `messages` : id, trade_id, sender_id, body, created_at
- `coin_transactions` : id, user_id, amount, type (purchase/trade_in/trade_out/upload_bonus/referral/escrow_hold/escrow_release), trade_id (nullable), stripe_payment_id (nullable)
- `reports` : id, reporter_id, target_type, target_id, reason, status
- `reviews` : id, trade_id, author_id, target_id, stars, comment

## 13. Hors scope MVP (plus tard)

- App native iOS/Android
- Envoi postal
- Push notifications (PWA)
- Algorithme de reco
- Multi-langue (FR/NL)
- Premium / boosts
- Partenariats friperies (points relais)
- Publicité

## 14. Étapes de développement suggérées (Claude Code)

1. Setup : Next.js + Supabase + Tailwind avec design tokens TRADE
2. Auth + onboarding (profil, tailles, styles, GPS)
3. Upload item + filtre photos + statut pending_review
4. Dashboard admin minimal (validation items)
5. Feed swipe + filtres + favoris
6. Détail item + trade flow (modes A & B) + escrow coins
7. Chat temps réel
8. Confirmation double + rating
9. Stripe : achat de coins + service fee
10. Settings, légal (ToS, Privacy), signalements
11. Tests + déploiement Vercel

## 15. Pratique

- **Dev** : Samyel pilote Claude Code sur son Mac
- **Domaine** : pas encore acheté — lancement possible sur `*.vercel.app`, alternatives à explorer (trade.be probablement pris)
- **Assets disponibles** : logo (`brand identity/TRADE_brand/`), photos vêtements (`photo's brand/`, `app/images/`), icônes coins (`app/Coins/`), markers/scribbles (`app/marker/`)
