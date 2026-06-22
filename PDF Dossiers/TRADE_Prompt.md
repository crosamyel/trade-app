Build a mobile web app called **TRADE** — a sustainable clothing swap platform where users exchange clothes without real money.

---

## Concept
Users upload clothes they no longer wear, swipe through items from others nearby, and trade or claim items using a virtual coin system. No real money changes hands for direct trades.

---

## Visual Identity
- Background: #F9F4E8 (warm cream)
- Primary accent: #FFC543 (yellow)
- Dark: #2A2A2A
- Eco accent: #7A8F58
- Warm accent: #D97A3A
- Typography: bold italic headlines, clean body text
- Decorative yellow brushstroke elements on cards and backgrounds
- Minimal, Gen Z aesthetic — warm, not cold

---

## Navigation
**Bottom bar:** Home | Messages | Upload (+) | Search | Profile  
**Top header:** TRADE logo (left) — Coin counter e.g. "🪙 20" + notification bell (right)

---

## Screens to build

### 1. Home (Swipe)
- Full-screen clothing card with large photo, item name, size, condition, distance
- Swipe left = Pass / Swipe right = Claim / Swipe up = Detail page
- Bottom buttons: ✕ Pass — ☆ Save — ✓ Claim

### 2. Detail Page
- Large item photo
- Item name, size badge, condition badge, coin value badge
- Seller profile: avatar, name, city, rating, trades done, "View profile" button
- AI-generated description of the item
- Two CTAs: "Send a message" + "Claim for X coins"

### 3. Upload Flow (3 steps)
- Step 1: Photo upload screen with camera icon
- Step 2: AI analysis in progress — spinning loader, "AI is analysing..."
- Step 3: Verify details — category, size, color, condition pre-filled by AI, coin value shown, "Trade" CTA button

### 4. Match Page
- Triggered when two users are mutually interested in each other's items
- Bold headline: "You've got a match!"
- Both items shown side by side with photo, name, condition, size
- Distance between users
- Two actions: "Open chat" and "Propose meetup"

### 5. Notifications Page
- List of notifications with item thumbnail, user name, time elapsed
- Types: Claim received / New match / New message / Trade completed
- Optional: two tabs — Activity and Messages

### 6. Profile Page
- Avatar, name, city, rating, number of trades done
- Coin balance and history
- My wardrobe (uploaded items grid)
- Saved/liked items section

### 7. Chat Page
- Standard messaging UI
- Shows the item being discussed at the top
- Option to confirm trade or propose meetup

---

## Transaction Systems

**System 1 — Claim with Coins**
User spends coins to claim an item → owner gets notified → owner accepts → item exchanged in person or by post

**System 2 — Direct Trade (free)**
Owner receives a claim notification → owner can browse the claimer's wardrobe → proposes a swap of items → other user accepts or declines → exchange in person or by post

---

## Coin System
- Earn coins: uploading items, completing successful transactions, welcome bonus at signup
- Spend coins: claiming items, paying for postal shipping
- Buy coins: in-app purchase option
- Coin counter always visible in header

---

## Tone
Warm, minimal, Gen Z. Feels like a community, not a marketplace. Sustainable but not preachy.
