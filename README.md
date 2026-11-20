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
- In the lobby the host sets two timers (other players see them read only):
  - **Game clock** (off, 15, 20, 30, 45, 60 or 90 minutes). When it runs out, the game ends as soon as the current turn finishes and the richest player (cash plus property value) wins.
  - **Move timer** (off, 30, 45, 60, 90 or 120 seconds per step). A player who runs over gets a careful bot for the rest of that turn: it rolls, skips any purchase, passes in auctions, turns down trades, carries out the card and ends the turn. It never buys, builds or trades with their money. If they owe money it raises cash the same way a disconnected player's bot would.
- Practice games offer the same two timers on the home screen.
- Every screen has a **VI | EN** switch in the top bar. Each player picks their own language on their own phone; the game log, cards, board labels and money format (15.000.000₫ or 15,000,000₫) all follow it.

## Rules in this edition

- Classic economy scaled to đồng: start with 15.000.000₫, 2.000.000₫ for passing Khởi hành. Internally 1 unit = 10.000₫.
- House rule: taxes, fines, jail fees and card payments go into the **Bãi đỗ xe** pot; landing there collects it.
- House rule: a player in jail collects no rent.
- Each city has 4 levels: 1, 2 and 3 houses, then its own landmark. Levels 1 and 2 can go on any city you own; level 3 and the landmark need the whole colour group, built evenly. The bank never runs out of houses or landmarks.
- Owning a whole colour group raises rent: double on empty land, one and a half times with 1 or 2 houses (levels 3 and 4 always have the group, so their rents already include it).
- Landing on an unowned square: buy it, auction it, or skip it.
- Cơ hội and Khí vận cards appear face down, flip over, and only take effect when their player taps the card's button.
- Full trading of cities and cash, proposed on your own turn (up to 3 offers per turn).
- Debts you can't cover lead to selling houses, mortgaging, or bankruptcy. Last player standing wins, or the richest player when the game clock runs out.

## Project map

All files sit at the top level of the repo.

```
board.ts        board squares, prices, rents, city groups
cards.ts        Cơ hội and Khí vận cards, in Vietnamese and English
i18n.ts         the VI | EN switch: t('Tiếng Việt', 'English') next to every piece of text
names.ts        English names for squares, colour groups and landmarks
format.ts       money formatting for each language
engine.ts       all rules: apply(state, playerId, action) -> new state
bot.ts          bot strategy (buying, bidding, building, trading) and the careful timeout play
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

To rename a city, change a price or rewrite a card, edit `board.ts` or `cards.ts` (and `names.ts` for the English name); everything else follows.
