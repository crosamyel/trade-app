# CLAUDE.md — TRADE

Tu travailles sur **TRADE**, une webapp mobile-first de troc de vêtements (kledingruil). Lis toujours `TRADE_SPECS.md` (même dossier) : c'est la source de vérité produit. Ce fichier-ci te dit COMMENT travailler.

## Profil de l'équipe
Deux étudiants, **peu/pas d'expérience en code**. Explique tes choix en une phrase simple, évite le jargon inutile. C'est toi qui écris le code ; eux valident visuellement.

## Stack (ne pas dévier sans demander)
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** : Postgres, Auth (Google + email), Storage, Realtime
- **Stripe** : achat de coins + service fee
- Déploiement **Vercel**, versioning **GitHub**

## Design tokens (Tailwind — à mettre dans la config)
- primary `#FFC543` (jaune) · background `#F9F4E8` (crème) · text `#2A2A2A`
- eco accent `#7A8F58` (vert) · warm accent `#D97A3A` (orange)
- Vibe : warm, clean, minimal, Gen Z, eco. Mobile-first, coins arrondis, beaucoup d'air.

## Assets disponibles (dossier ../ = Documents/TRADE/)
- Écrans de référence : `app/pdf/Trade_V1.pdf` et `Trade_V1.png` → **reproduis-les fidèlement**
- Logos : `logo/TRADE_MAIN_LOGO.png`, `logo/TRADE_SECOND_LOGO*.png`
- Photos vêtements : `photo's brand/`, `app/images/`, `app/Images cut/`
- Icône coins : `app/Coins/` · markers/scribbles : `app/marker/`
Copie les assets utilisés dans `public/` du projet.

## Méthode de travail — IMPORTANT
1. **Un écran / une fonctionnalité à la fois.** Ne construis jamais 5 écrans d'un coup.
2. Avant de coder un écran : décris en 2-3 lignes ce que tu vas faire, attends le feu vert si c'est un nouveau flow.
3. Après chaque écran : lance `npm run dev` et dis-moi quoi regarder sur `localhost:3000`.
4. **Commit git après chaque écran validé** (`git add -A && git commit -m "..."`). Ne regroupe pas.
5. Si un design Figma manque (voir §11 des specs), **ne l'invente pas** : signale-le et propose une version provisoire clairement marquée TODO.
6. Pas de secrets en dur. Mets clés Supabase/Stripe dans `.env.local` (jamais commité).
7. Code lisible, composants réutilisables, commentaires en français là où c'est utile.

## Ordre de construction (voir §14 specs)
1. Setup projet + tokens + layout mobile  2. Auth + onboarding (profil, tailles, styles, GPS)
3. Upload item + filtre photo + pending_review  4. Dashboard admin minimal (validation)
5. Feed swipe + filtres + favoris  6. Détail item + trade flow (modes A & B) + escrow coins
7. Chat temps réel  8. Double confirmation + rating  9. Stripe coins + service fee
10. Settings + légal (ToS/Privacy) + signalements  11. Tests + déploiement Vercel

Commence par l'étape 1 seulement, puis arrête-toi et montre le résultat.

## Modèle de données
Voir §12 des specs (tables `users, items, swipes, saves, trades, messages, coin_transactions, reports, reviews`). Crée les migrations Supabase au fur et à mesure, pas tout d'un coup.

## Règles métier sensibles
- Coins en **escrow** tant que les deux n'ont pas confirmé ; remboursés si annulation.
- Items : `draft → pending_review → active → reserved → traded`.
- Localisation : stocker lat/lng **approximatif**, jamais l'adresse exacte.
- Âge min 16 ans + acceptation ToS/Privacy à l'inscription (RGPD).
