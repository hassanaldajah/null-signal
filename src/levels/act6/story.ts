// Shared facts for Act 6 (the response and the finale: contain, verify the cleanup, unmask). See ../PLOT.md.
import { ACT5 } from '../act5/story';

export const ACT6 = {
  ...ACT5,
  now: '2026-03-16T12:00:00Z',
  ir: '/home/a.nasser/ir',
  finIp: '10.20.6.21',
  /** NovaBackup's shared interactive VPN account (contract V-2207): gh0st's quiet door. */
  vendorAccount: 'nova-svc',
  /** The nightly backup pull: a separate, read-only vendor account. Legitimate. */
  pullAccount: 'vendor-backup',
  contract: 'V-2207',
  /** Contract V-2207 allows interactive vendor sessions only in this window. */
  window: 'Sundays 01:00-03:00 UTC',
  /** First nova-svc session outside the window: 16 min after the whiteboard photo (15:42 UTC). */
  firstOutside: '2026-03-11',
} as const;

/** nova-svc sessions on the vendor gateway, Mar 1-14: two inside the Sunday window, five outside it. */
export const NOVA_SESSIONS: [start: string, minutes: number][] = [
  ['2026-03-01T01:12:30Z', 48],
  ['2026-03-08T01:20:05Z', 41],
  ['2026-03-11T15:58:02Z', 14], // the day of the whiteboard photo at NovaBackup's office
  ['2026-03-13T03:04:40Z', 9], // minutes before the 03:12 VPN login as s.haddad
  ['2026-03-13T03:38:50Z', 6], // before the 03:41 portal download and 03:45 on db01
  ['2026-03-13T08:35:20Z', 5], // before the 08:41 mailbox staging
  ['2026-03-13T08:42:10Z', 4], // before the 08:44 send
];

/** NovaBackup staff on contract V-2207 (L27). Three share the phishing kit's initials "km" (L08). */
export const NOVA_STAFF: [name: string, role: string, office: string, vpnKey: string][] = [
  ['Karim Mansour', 'support lead (contract signatory)', 'remote', 'no'],
  ['Kade Mercer', 'field engineer', 'main office', 'yes'],
  ['Katya Morel', 'backup engineer', 'main office', 'yes'],
  ['Lena Brandt', 'account manager', 'main office', 'no'],
  ['Omar Fadel', 'field engineer', 'remote', 'yes'],
];
