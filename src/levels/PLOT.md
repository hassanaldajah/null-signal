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
- **Kade Mercer** (`k.mercer`), NovaBackup contractor = **gh0st**. Revealed in L30, the hardest level.
- **ECHO**, the player's assistant (Byte model). **The Ghost** taunts after each boss.

## Attacker infrastructure
- Attacker IP `203.0.113.77` (VPN login, beacon target, phishing mail server).
- Look-alike domain `helixdynamlcs.example` (i -> l). Second trick domain `verify-session.example`.
- Exfil domain (Act 6) `cdn-sync.example`, DNS tunnel via `*.t.cdn-sync.example`.

## Timeline (UTC, 2026)
- Mar 02: Samir sets `Falcon#Rise26`.
- Mar 12 22:31: phishing wave from `203.0.113.77` (spoofed From: IT Service Desk) to 6 staff.
- Mar 12 22:47: Samir submits credentials on the fake page (patient zero). 08:12 Mar 13: Mei Chen.
- Mar 13 03:12: VPN login as s.haddad from `203.0.113.77`; password spray; j.ortiz falls.
- Mar 13 03:16: beacon `/tmp/.X11-cache/.sync`; 03:38 cron persistence in `backup.sh`.
- Mar 13-14: credential dumping (Act 3), web attack + history (Act 4), staging files (Act 5),
  DNS-tunnel exfil and Windows malware on the finance PC via Mei's account (Act 6).

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
6. Unmasking (L26-L30), the former Network, Threat Detection and Windows acts merged (owner's call):
   L26 a packet capture (IPs/ports, DNS lookups, a plain-HTTP login, the DNS tunnel, a firewall block);
   L27 the finance PC: an unfamiliar process, its process tree and its Run key; L28 strings in that
   program (build path `C:\Users\kmercer\dev\sync\`), a base64 config and the IOC list; L29 Windows
   logon events (`nova-svc` from the vendor VPN before each step) and a detection rule; L30 the
   finale, the hardest level: the incident report, unmasking gh0st = Kade Mercer from every clue.

## Identity clues (planted early, paid off in L30)
- L08: phishing kit HTML comment `ops: km`.
- L15: reused password works on the NovaBackup portal account `kmercer-admin`'s audit trail.
- L23: EXIF Artist `kmercer`.
- L28: build path `C:\Users\kmercer\dev\sync\`.
- L29: vendor VPN `198.51.100.23` logon by `nova-svc` minutes before each attack step.
