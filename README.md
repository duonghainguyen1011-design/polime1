# Polime

A Vietnamese property-trading board game for 2 to 6 players, played online on phones. Players join a room by link with just a name, pick a Vietnamese token, and play on a board of Vietnamese cities with money in đồng.

Built with React + Vite, Supabase (database + realtime) and Netlify.

## Set up (about 10 minutes)

### 1. Create the Supabase project

1. Create a new project at supabase.com.
2. Open **SQL Editor**, paste everything from `supabase/schema.sql`, and click **Run**. This creates the `rooms` table, its access policies, and turns on realtime for it.
3. Open **Project Settings > API Keys** (or **Data API**) and copy:
   - the **Project URL**
   - the **publishable key** (called the **anon** key on older projects)

### 2. Deploy on Netlify

1. Put this folder in a GitHub repo, then in Netlify choose **Add new site > Import an existing project** and pick the repo. Build settings come from `netlify.toml`.
2. In **Site configuration > Environment variables**, add:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the publishable or anon key
3. Trigger a deploy. Vite bakes these values in at build time, so redeploy after changing them.

Prefer drag-and-drop? Create `.env.local` from `.env.example`, run `npm install && npm run build`, and drop the `dist` folder onto Netlify.

### 3. Run locally

```
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

Without the two values the app still runs, with online play switched off and practice mode against bots available.

## How a game works

- The host taps **Tạo phòng mới**, then **Mời bạn bè** to share the link (`?r=CODE`). Friends open it, type a name, pick a token and join. The host starts once 2 or more players are in.
- Every phone shows the same board in real time. Each move is saved as one row update with a version check, so two phones can never overwrite each other.
- If a phone disconnects for about 8 seconds, a bot plays for that player until they reopen the link. One connected phone runs the bots, chosen automatically.

## Rules in this edition

- Classic economy scaled to đồng: start with 15.000.000₫, 2.000.000₫ for passing Khởi hành. Internally 1 unit = 10.000₫.
- House rule: taxes, fines, jail fees and card payments go into the **Bãi đỗ xe** pot; landing there collects it.
- House rule: a player in jail collects no rent.
- Unbought cities go to auction (turn-based bidding).
- Building is even across a colour group; the bank has 32 houses and 12 hotels.
- Full trading of cities and cash, proposed on your own turn (up to 3 offers per turn).
- Debts you can't cover lead to selling houses, mortgaging, or bankruptcy. Last player standing wins.

## Project map

```
src/game/board.ts     board squares, prices, rents, city groups
src/game/cards.ts     Cơ hội and Khí vận cards
src/game/engine.ts    all rules: apply(state, playerId, action) -> new state
src/game/bot.ts       bot strategy (buying, bidding, building, trading)
src/net/conn.ts       Supabase room connection and local practice mode
src/ui/*              board, tokens, sheets, lobby, home
src/styles.css        lacquer and gold design, light and dark themes
scripts/simulate.ts   plays hundreds of bot games to check the rules: npm run simulate
```

To rename a city, change a price or rewrite a card, edit `board.ts` or `cards.ts`; everything else follows.
