# NULL SIGNAL: plot bible (maintainers only)

Every level must stay consistent with these facts. Per-act constants live in `actN/story.ts`.
All domains use the reserved `.example` TLD and all public IPs come from RFC 5737 ranges,
so nothing in the game points at a real organization or host.

## Cast
- **Helix Dynamics** (`helixdynamics.example`), mid-size engineering firm. Workstation `helix-ws07`.
- **Samir Haddad** (`s.haddad`), sysadmin. Reported the intrusion, then went silent (he is safe:
  locked out and on leave; he reappears in the finale).
- **Jamie Ortiz** (`j.ortiz`), engineer. Weak password, sprayed in Act 1, abused as second account.
- **Mei Chen** (`m.chen`), finance. Second phishing victim (Act 2).
- **NovaBackup** (`novabackup.example`), backup vendor with approved VPN from `198.51.100.23`
  (contract V-2207). Treated as harmless noise in Act 1. It is not.
- **Kade Mercer** (`k.mercer`), NovaBackup field engineer = **gh0st**. Revealed in L27, the final and hardest level.
- **ECHO**, the player's assistant (Byte model). **The Ghost** taunts after each boss.

## Attacker infrastructure
- Attacker IP `203.0.113.77` (VPN login, beacon target, phishing mail server).
- Look-alike domain `helixdynamlcs.example` (i -> l). Second trick domain `verify-session.example`.
- Exfil domain (Acts 4-5) `cdn-sync.example`, data sent out through names under `t.cdn-sync.example`.
- Quiet door: NovaBackup's shared vendor account `nova-svc` from the approved vendor VPN `198.51.100.23`,
  used outside the contract window (Sundays 01:00-03:00 UTC) from Mar 11.

## Timeline (UTC, 2026)
- Mar 02: Samir sets `Falcon#Rise26`.
- Mar 12 22:31: phishing wave from `203.0.113.77` (spoofed From: IT Service Desk) to 6 staff.
- Mar 12 22:47: Samir submits credentials on the fake page (patient zero). 08:12 Mar 13: Mei Chen.
- Mar 13 03:12: VPN login as s.haddad from `203.0.113.77`; password spray; j.ortiz falls.
- Mar 13 03:16: beacon `/tmp/.X11-cache/.sync`; 03:38 cron persistence in `backup.sh`.
- Mar 11 15:42 UTC: whiteboard photo at NovaBackup's office; 15:58 first `nova-svc` session outside the window.
- Mar 13-14: credential dumping (Act 3), web attack + history (Act 4), staging files and the mailbox
  sent out (Act 5). His next step (HELIX-FIN03 as m.chen) never happened: containment came first (Act 6).
- Mar 16: containment (L26), cleanup verified and the report written (L27).

## Acts
1. Linux Basics (L01-L05): get in, find the attacker IP, beacon, sprayed account, cron persistence.
2. Phishing (L06-L10): how the password was stolen: headers, look-alike links, HTML attachment,
   SPF/DKIM/DMARC (p=none), patient zero via proxy logs.
3. Password Hygiene (L11-L15): base64 vs hashing, hash formats, audit accounts against a tiny
   common-passwords list, repeated failed logins in auth.log, accounts that reuse a password
   (Samir reused his password on the NovaBackup portal).
4. Logs & Timeline (L16-L20): auth.log, web access log (intranet backup left in the web root,
   downloaded by 203.0.113.77 with curl; the nightly NovaBackup pull is the baseline),
   bash_history, cron, full timeline.
5. File Forensics (L21-L25): magic bytes (a second hidden staging folder, `/var/tmp/.fontconfig-cache`
   on ws07: Mei Chen's mailbox disguised as `fonts.cache-7`, an ELF posing as `x11-icon.png`), deleted
   file recovery, EXIF (photo with author `kmercer`, GPS near NovaBackup office), a hidden message,
   hashing / chain of custody.
6. Unmasking (L26-L27), the response and the end of the game (owner's call: the game ends at 27):
   L26 containment: quarantine HELIX-FIN03 running, disable `nova-svc` (keep the read-only
   `vendor-backup` pull), add the missing attacker IP to the firewall list, block his domains at the resolver;
   L27 the finale, the hardest level: the cleanup missed the db01 crontab, FIN03's process tree and Run
   keys are clean (the plan never ran), then the incident report unmasks gh0st = Kade Mercer from clues
   across the whole game, a detection rule (vendor sessions outside the window) and the root-cause fix.

## Identity clues (planted early, paid off in L27)
- L08: phishing kit HTML comment `ops: km` (L27 asks for it from memory; it is not repeated there).
- L14: `nova-svc` logs in from the vendor VPN at 03:05, minutes before the 03:12 VPN login.
- L15: the NovaBackup portal account `kmercer-admin` downloaded the stolen export.
- L23: EXIF Artist `kmercer`; GPS = NovaBackup's main office, Mar 11.
- L26: `nova-svc` is a shared admin account, still enabled.
- L27: the staff list has three "km" people (Karim Mansour remote; Kade Mercer and Katya Morel in the
  main office) and no usernames; only `kmercer` + the office fit one person. The vendor gateway log shows
  `nova-svc` outside the Sunday window from Mar 11, minutes before each attack step.
