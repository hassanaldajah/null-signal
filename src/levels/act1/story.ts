// Shared facts for Act 1 (Helix Dynamics breach). Keep every level consistent with these.
export const ACT1 = {
  host: 'helix-ws07',
  gateway: 'helix-gw',
  user: 's.haddad',
  home: '/home/s.haddad',
  now: '2026-03-14T09:30:00Z',
  attackerIp: '203.0.113.77',
  scannerIp: '203.0.113.7', // known internet scanner: noise, NOT the attacker
  vendorIp: '198.51.100.23', // approved vendor VPN
  password: 'Falcon#Rise26',
  secondAccount: 'j.ortiz',
  handle: 'gh0st',
  stagingDir: '/tmp/.X11-cache',
  persistence: '/opt/helix/bin/backup.sh',
} as const;
