# NULL SIGNAL

An educational, defense-focused cyber-investigation game in the browser, in **English and Arabic**.
You play an investigator on a fake operating system ("NEXUS OS"): read fictional evidence, connect it on
an evidence board, and learn how real defenders detect, contain and prevent incidents.

> Everything in the game is static fictional data inside the browser. Nothing runs on, connects to or targets
> any real system. Domains use the reserved `.example` TLD and IPs come from RFC 5737 documentation ranges.

## Features
- 30 levels in 6 acts (Linux basics, phishing awareness, password hygiene, logs and timelines, file forensics,
  and the unmasking: network, threat detection and Windows), each act ending with a boss case.
- Simulated apps: terminal (bash-like, read-only), files, notes, mail, log viewer, hex viewer, browser,
  network capture table, processes, registry and an evidence board with linked cards.
- 3-tier hints with score costs, debriefs with real-world tools and sources (NIST, MITRE ATT&CK, RFCs),
  ranks, achievements and local saves.
- 3D characters made in Blender (headless scripts in `blender/`), mobile layout, RTL Arabic.

## Run locally
```bash
npm install
npm run dev          # http://localhost:5173
```

## Checks
```bash
npm run typecheck    # TypeScript
npm run validate     # level rules, evidence graph and in-shell self-tests
npx vite build && npm run check   # end-to-end check in installed Microsoft Edge
```

## Deploy (Cloudflare Pages, free tier)
1. Push the repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build command `npm run build`, output directory `dist`.
4. Add a custom subdomain under Custom domains.

The build writes `dist/_headers` with the security headers (CSP, HSTS, frame and referrer policy).

## Project layout
- `src/levels/` level data (`actN/lXX.ts`), story bible `PLOT.md`, hub map `manifest.ts`
- `src/engine/` schema, runtime, validators, virtual filesystem, shell
- `src/os/` desktop shell and apps; `src/scenes/` boot, login, hub (React Three Fiber)
- `blender/` character build scripts; `public/models/` exported GLB files

## License
Game code, level content, sounds and characters are original to this project. Libraries and fonts
(React, three.js, xterm.js, Fontsource fonts under the SIL Open Font License, and others in `package.json`)
keep their own licenses.
