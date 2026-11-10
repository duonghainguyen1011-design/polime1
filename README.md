# Polime

A Vietnamese property-trading board game for 2 to 6 players, played online on phones. Players join a room by link with just a name, pick a Vietnamese token, and play on a board of Vietnamese cities with money in đồng.

Built with React + Vite, Supabase (database + realtime) and Netlify.

## Set up (about 10 minutes)

### 1. Create the Supabase project

1. Create a new project at supabase.com.
2. Open **SQL Editor**, paste everything from `schema.sql`, and click **Run**. This creates the `rooms` table, its access policies, and turns on realtime for it.
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
- House rule: any city you own can take up to 2 houses. The 3rd and 4th house and the hotel need the whole colour group, built evenly. The bank never runs out of houses or hotels.
- Full trading of cities and cash, proposed on your own turn (up to 3 offers per turn).
- Debts you can't cover lead to selling houses, mortgaging, or bankruptcy. Last player standing wins.

## Project map

All files sit at the top level of the repo.

```
board.ts        board squares, prices, rents, city groups
cards.ts        Cơ hội and Khí vận cards
engine.ts       all rules: apply(state, playerId, action) -> new state
bot.ts          bot strategy (buying, bidding, building, trading)
conn.ts         Supabase room connection and local practice mode
scene3d.ts      the 3D board: diamond camera, chunky squares, tokens, dice, zoom, tapping
buildings.ts    cartoon buildings: tube houses, Hội An shophouses, stilt houses, and a landmark for every city
tokens3d.ts     the eight painted toy tokens
decor.ts        scenery in the middle: palms, bamboo, pond, basket boat, paddies
texture.ts      paints the square faces, the centre and the banner logo
layout.ts       where every square, plot and label sits on the board
Board3D.tsx     React wrapper for the 3D board (falls back to the flat board without WebGL)
App.tsx, BoardView.tsx, Game.tsx, Home.tsx, Lobby.tsx, sheets.tsx, parts.tsx, icons.tsx, hooks.ts   interface
styles.css      dusk-toned cartoon look for every screen
schema.sql      run once in Supabase
simulate.ts     plays hundreds of bot games to check the rules: npm run simulate
```

To rename a city, change a price or rewrite a card, edit `board.ts` or `cards.ts`; everything else follows.
