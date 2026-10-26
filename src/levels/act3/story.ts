// Shared facts for Act 3 (what gh0st did with the stolen access). See ../PLOT.md.
// Every hash is a real digest of a fictional password, so players can verify it with
// md5sum/sha1sum. Slow salted hashes are fake strings in the right format (never computed).
import { md5, sha1 } from '../../engine/hash';
import { ACT2 } from '../act2/story';

export const ACT3 = {
  ...ACT2,
  now: '2026-03-14T13:30:00Z',
  loot: '/tmp/.X11-cache/loot',
  dump: '/srv/wiki/db/users.dump',
  portal: 'portal.novabackup.example',
  portalAdmin: 'kmercer-admin',
  exportJob: 'helix-full-2026-03',
  bruteIp: '192.0.2.44',
} as const;

/** Fictional weak passwords that also appear in the game's tiny breach list. */
export const WEAK = { 'd.brooks': 'password1', 'l.ito': 'liverpool', 'j.ortiz': 'summer2025' } as const;

/** Legacy wiki accounts: three unsalted fast hashes, two salted slow ones. */
export const WIKI_USERS: [user: string, hash: string][] = [
  ['d.brooks', md5(WEAK['d.brooks'])],
  ['l.ito', md5(WEAK['l.ito'])],
  ['j.ortiz', sha1(WEAK['j.ortiz'])],
  ['m.chen', '$2b$12$Q9vPqTzL1mXo8aRk2YwJhuW7cE3nB5dF0gH4jK6lM8pN1rS3tV5xy'],
  ['s.haddad', '$6$Hx7Lp2Qa$uT4vW1yZ0bC9dE8fG7hI6jK5lM4nO3pQ2rS1tU0vW9xY8zA7bC6dE5fG4hI3jK2lM1nO0pQ9rS8tU7vW6xY5z'],
];

export const dumpFile = () => `${WIKI_USERS.map(([user, hash]) => `${user}:${hash}`).join('\n')}\n`;

/** Base64 of "user:password", the way the beacon stored stolen logins. */
export const b64 = (text: string) => btoa(text);
