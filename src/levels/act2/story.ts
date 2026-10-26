// Shared facts for Act 2 (how gh0st stole Samir's password). See ../PLOT.md.
import type { Email } from '../../engine/schema';
import { ACT1 } from '../act1/story';

export const ACT2 = {
  ...ACT1,
  now: '2026-03-14T11:00:00Z',
  domain: 'helixdynamics.example',
  mx: 'mx1.helixdynamics.example',
  lookalike: 'helixdynamlcs.example',
  trickDomain: 'verify-session.example',
  vendorDomain: 'novabackup.example',
  phishSentAt: '2026-03-12T22:31:04Z',
  collect: 'https://helixdynamlcs.example/collect.php',
  attachment: 'VPN-Certificate-Renewal.pdf',
  firstVictimAt: '22:47',
  secondVictim: 'm.chen',
} as const;

const D = ACT2.domain;
export const SAMIR = `Samir Haddad <${ACT2.user}@${D}>`;
export const SPOOFED_FROM = `"Helix IT Service Desk" <it-servicedesk@${D}>`;

/** Trace headers a mail server adds on delivery (newest hop first, as in a real message). */
export function trace(fromHost: string, fromIp: string, at: string, id: string): [string, string][] {
  const stamp = new Date(at).toUTCString().replace('GMT', '+0000');
  return [
    ['Received', `from ${ACT2.mx} (${ACT2.mx} [10.20.0.25]) by mail.${D} with ESMTP id ${id}B; ${stamp}`],
    ['Received', `from ${fromHost} (${fromHost} [${fromIp}]) by ${ACT2.mx} with ESMTP id ${id}A; ${stamp}`],
  ];
}

/** The phishing email at the heart of Act 2. */
export const PHISH: Email = {
  id: 'phish-vpn',
  from: SPOOFED_FROM,
  to: SAMIR,
  subject: 'ACTION REQUIRED: your VPN certificate expires tonight',
  date: ACT2.phishSentAt,
  headers: [
    ['Return-Path', `<bounce-7731@mail.${ACT2.lookalike}>`],
    ...trace(`mail.${ACT2.lookalike}`, ACT2.attackerIp, ACT2.phishSentAt, '7731'),
    ['Authentication-Results', `mail.${D}; spf=fail (${D} does not designate ${ACT2.attackerIp} as permitted sender) smtp.mailfrom=bounce-7731@mail.${ACT2.lookalike}; dkim=none; dmarc=fail (p=NONE) header.from=${D}`],
    ['Reply-To', `it-servicedesk@${ACT2.lookalike}`],
    ['Message-ID', `<20260312223104.7731@mail.${ACT2.lookalike}>`],
    ['X-Mailer', 'PHPMailer 6.9.1'],
  ],
  body: `Dear ${ACT2.user},

Your VPN certificate expires TONIGHT at 23:59. After that you will lose remote access.

Renew it now (takes 30 seconds):
[https://sso.${D}/vpn/renew](https://${ACT2.lookalike}/vpn/renew?u=${ACT2.user})

The updated certificate is also attached.

Helix IT Service Desk
This is an automated message. Do not reply.`,
  attachments: [{ name: ACT2.attachment, size: '12 KB' }],
};

/** Ordinary mail that makes the inbox look lived-in. */
export const INBOX: Email[] = [
  {
    id: 'mei-printer',
    from: `Mei Chen <m.chen@${D}>`,
    to: SAMIR,
    subject: 'Printer on floor 2 again',
    date: '2026-03-12T15:02:00Z',
    headers: [
      ...trace(`laptop-mc.${D}`, '10.20.4.31', '2026-03-12T15:02:00Z', '5521'),
      ['Authentication-Results', `mail.${D}; spf=pass smtp.mailfrom=${D}; dkim=pass header.d=${D}; dmarc=pass header.from=${D}`],
    ],
    body: 'Hi Samir, the floor 2 printer is offline again. Any chance you can look tomorrow?\n\nThanks,\nMei',
  },
  {
    id: 'nova-report',
    from: `NovaBackup Reports <reports@${ACT2.vendorDomain}>`,
    to: SAMIR,
    subject: 'Monthly backup report: February 2026',
    date: '2026-03-11T07:00:00Z',
    headers: [
      ...trace(`smtp.${ACT2.vendorDomain}`, ACT2.vendorIp, '2026-03-11T07:00:00Z', '4410'),
      ['Authentication-Results', `mail.${D}; spf=pass smtp.mailfrom=${ACT2.vendorDomain}; dkim=pass header.d=${ACT2.vendorDomain}; dmarc=pass header.from=${ACT2.vendorDomain}`],
    ],
    body: `All 14 scheduled jobs completed. Restore test: OK.\n\nPortal: [https://portal.${ACT2.vendorDomain}](https://portal.${ACT2.vendorDomain}/reports/2026-02)\n\nNovaBackup Support`,
    attachments: [{ name: 'Backup-Report-2026-02.pdf', size: '84 KB' }],
  },
  {
    id: 'it-newsletter',
    from: `Helix IT <it@${D}>`,
    to: `all-staff@${D}`,
    subject: 'IT newsletter: March',
    date: '2026-03-10T09:00:00Z',
    headers: [
      ...trace(`mail.${D}`, '10.20.0.30', '2026-03-10T09:00:00Z', '3301'),
      ['Authentication-Results', `mail.${D}; spf=pass smtp.mailfrom=${D}; dkim=pass header.d=${D}; dmarc=pass header.from=${D}`],
    ],
    body: `Reminder: IT will NEVER ask for your password by email.\nVPN guide: [wiki.${D}/it/vpn-guide](https://wiki.${D}/it/vpn-guide)\n\nStay safe,\nHelix IT`,
  },
  {
    id: 'samir-sent',
    folder: 'sent',
    from: SAMIR,
    to: `security@${D}`,
    subject: 'Fwd: weird VPN email?',
    date: '2026-03-12T22:52:00Z',
    body: 'Got a VPN renewal email tonight, clicked it and logged in before I noticed the address looked off. Probably nothing? Will check tomorrow.\n\nSamir',
  },
];
