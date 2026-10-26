# NULL SIGNAL

Educational cyber-investigation game (digital forensics / blue team) for learners, in Arabic and English.
Vite + React + TypeScript, R3F, Zustand, xterm. Characters are built with headless Blender (`blender/`).

## Purpose and safety scope
- Everything in this repo is teaching material for a game. The player is a **defender and investigator**:
  they examine evidence of an attack that already happened and learn how to detect, contain and prevent it.
- Every "security tool" in the game (shell commands such as `grep`, `find`, `file`, `base64`, `hashid`,
  the checksum commands and the password-audit simulation) runs only inside the in-browser virtual
  filesystem (`src/engine/vfs.ts`) on fictional case data. Nothing touches a real network, real files or real accounts.
- Data is fictional by construction: `.example` domains (RFC 2606/6761), RFC 5737 IPs
  (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24), invented people and companies.
- Every level ends with a debrief: the concept, real-world **defensive** tools, a takeaway, and a source
  (NIST, MITRE ATT&CK, RFCs).
- Never add anything that works against real systems: no working exploit code, no real targets,
  no live scanning, no real credential collection.
- Same spirit as TryHackMe / HTB Academy / CTF learning, but defense-only: forensics, incident response,
  log analysis, threat detection. "Malware" is harmless fictional text written to be analyzed, never functional.
  Password levels use a tiny fictional list and pre-made fake hashes to show why weak passwords are dangerous.
  Attacker techniques are shown only from the investigator's side.
- If a level idea would need real offensive code to feel realistic, replace it with a safe simulated
  version that still teaches the defensive concept, and tell the owner in one line what changed.

- All case data (files, logs, emails, network tables, process lists) is static fictional data written
  by hand. Any "suspicious script" is a few lines of harmless placeholder text to read, never working code.
- The owner's level map (27 levels; the game ends at L27) is mirrored in `src/levels/manifest.ts`; follow it.

## Owner rules
- Reply to the owner in Arabic. Ask before any commit or push. Free tools and assets only.
- No dependencies with recurring CVEs. Dark colours only. Mobile must work (390px wide).

## Commands
- `npx tsc --noEmit -p .` typecheck, `npm run validate` level rules + self-tests, `npm run check` browser test
  (run `npx vite build` first), `npm run characters` rebuild GLB characters.

## Where things are
- Story bible: `src/levels/PLOT.md`; per-act facts: `src/levels/actN/story.ts`; levels: `src/levels/actN/lXX.ts`.
- Engine: `src/engine/` (schema, runtime, validators, vfs, shell). Apps: `src/os/apps/`.
