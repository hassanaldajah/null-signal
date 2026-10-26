// Shared facts for Act 5 (what gh0st staged before sending it out). See ../PLOT.md.
import type { PhotoMeta } from '../lib/binary';
import { ACT4 } from '../act4/story';

export const ACT5 = {
  ...ACT4,
  now: '2026-03-15T09:30:00Z',
  soc: 'helix-soc01',
  /** Read-only copy of the helix-ws07 disk image (taken Mar 14 18:20 UTC) in the analyst's home. */
  image: '/home/a.nasser/evidence/ws07',
  /** Second hidden staging folder on ws07: /var/tmp survives a reboot, /tmp does not. */
  stash: '/var/tmp/.fontconfig-cache',
  /** Mei Chen's mailbox, pulled with her phished password and staged for exfiltration. */
  mailbox: 'm.chen-mailbox.tar',
  mailboxStagedAt: '2026-03-13T08:41:07Z',
  /** ws07 clock zone, the same as the VPN console in L20. Trash dates are written in it. */
  localOffset: '+0200',
  wsIp: '10.20.4.17',
  /** Samir's ~/.bash_aliases turns rm into trash-put (trash-cli): gh0st's "deletes" landed here. */
  trash: '/home/s.haddad/.local/share/Trash',
  sendLog: 'send.log',
  chunks: 2101,
  sendStart: '2026-03-13T08:44:02Z',
  sendDone: '2026-03-13T08:55:40Z',
  /** One `rm send.log wb-0311.jpg` in the stash. DeletionDate = 10:58:31 local. */
  trashedAt: '2026-03-13T08:58:31Z',
  photo: 'wb-0311.jpg',
  /** Hidden note in fonts.conf (carriage-return trick), written while the mailbox was sending. */
  noteAt: '2026-03-13T08:47:03Z',
  finHost: 'HELIX-FIN03',
} as const;

/** NovaBackup's office (vendor contract V-2207): where the whiteboard photo was taken. */
export const NOVA_OFFICE = { lat: 34.684233, lon: 33.0379, text: '34.6842 N, 33.0379 E' } as const;

/** EXIF of the whiteboard photo gh0st copied to ws07 and later "deleted" (L22 trash, L23 EXIF, L25 custody). */
export const PHOTO: PhotoMeta = {
  make: 'Lumora',
  model: 'Lumora P7',
  software: 'P7 Camera 4.2',
  artist: 'kmercer',
  description: 'whiteboard',
  taken: '2026:03:11 17:42:09',
  offset: '+02:00',
  width: 4032,
  height: 3024,
  lat: [34, 41, 3.24],
  lon: [33, 2, 16.44],
};

/** Lines hidden in fonts.conf behind carriage returns (L24). */
export const FONTS_CONF_HIDDEN = [
  '<!-- mc mailbox: sending via t. -->',
  '<!-- next: FIN03 as m.chen, rdp -->',
  '<!-- sync.exe as svchost, logon -->',
  '<!-- then wipe ws07. -- gh0st -->',
];

/** fonts.conf: each hidden comment is followed by \r, then a visible line padded to cover it. */
export function fontsConf(): string {
  const visible = ['<?xml version="1.0"?>', '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">', '<fontconfig>', '  <dir>~/.local/share/fonts</dir>', '  <cachedir>~/.cache/fontconfig</cachedir>', '</fontconfig>'];
  const cover = (hidden: string, shown: string) => `${hidden}\r${shown.padEnd(hidden.length)}`;
  return [
    visible[0],
    visible[1],
    ...FONTS_CONF_HIDDEN.map((hidden, i) => cover(hidden, visible[i + 2])),
    '',
  ].join('\n');
}

/** x11-helper's own log, thrown in the Trash with the photo (L22, custody item E1 in L25). */
export function sendLogText(): string {
  return [
    `x11-helper 0.9  split=${ACT5.stash}/fonts.cache-7  label-max=63`,
    `${ACT5.sendStart} start   chunks=${ACT5.chunks}  via=${ACT5.exfilVia}  rr=TXT`,
    '2026-03-13T08:47:15Z sent    0400/2101',
    '2026-03-13T08:49:51Z timeout at 0731/2101 (resolver busy), retry in 30s',
    '2026-03-13T08:50:21Z resume  0731/2101',
    '2026-03-13T08:53:02Z sent    1600/2101',
    `${ACT5.sendDone} done    2101/2101 acked (0 lost)`,
    '',
  ].join('\n');
}

/** Text inside the ELF that posed as x11-icon.png (L21, L24, L25). Placeholder bytes, no code. */
export const X11_HELPER_TEXT = '\0x11-helper 0.9\0usage: x11-helper --split FILE --label-max 63\0placeholder build for the NULL SIGNAL case: no code\0';
