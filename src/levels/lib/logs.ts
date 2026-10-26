// Deterministic generators for realistic log files, so level configs stay compact.
// All public IPs in the game come from RFC 5737 documentation ranges
// (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24): they never point at real hosts.

export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Syslog timestamp: "Mar 13 03:12:44". */
export function syslogTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${MONTHS[date.getUTCMonth()]} ${String(date.getUTCDate()).padStart(2, ' ')} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export type SshEvent =
  | { kind: 'accepted'; user: string; ip: string; at: Date }
  | { kind: 'failed'; user: string; ip: string; at: Date; invalidUser?: boolean }
  | { kind: 'closed'; user: string; ip: string; at: Date };

/** OpenSSH-style auth.log lines, sorted by time. */
export function sshdLog(host: string, events: SshEvent[], seed = 1): string {
  const rand = seeded(seed);
  return [...events]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((event) => {
      const pid = 1000 + Math.floor(rand() * 8000);
      const port = 40000 + Math.floor(rand() * 25000);
      const prefix = `${syslogTime(event.at)} ${host} sshd[${pid}]:`;
      switch (event.kind) {
        case 'accepted':
          return `${prefix} Accepted password for ${event.user} from ${event.ip} port ${port} ssh2`;
        case 'failed':
          return `${prefix} Failed password for ${event.invalidUser ? 'invalid user ' : ''}${event.user} from ${event.ip} port ${port} ssh2`;
        case 'closed':
          return `${prefix} Connection closed by authenticating user ${event.user} ${event.ip} port ${port} [preauth]`;
      }
    })
    .join('\n') + '\n';
}

/** Spreads `count` events between `start` and `start + minutes`. */
export function spread(start: string, minutes: number, count: number, seed: number): Date[] {
  const rand = seeded(seed);
  const base = new Date(start).getTime();
  return Array.from({ length: count }, () => new Date(base + Math.floor(rand() * minutes * 60_000)));
}

/** Generic "app.log" style noise lines. */
export function appLog(service: string, start: string, lines: number, seed: number, messages: string[]): string {
  const rand = seeded(seed);
  const base = new Date(start).getTime();
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    const at = new Date(base + i * 47_000 + Math.floor(rand() * 30_000));
    const level = rand() < 0.86 ? 'INFO' : rand() < 0.7 ? 'WARN' : 'ERROR';
    out.push(`${at.toISOString()} ${level.padEnd(5)} [${service}] ${messages[Math.floor(rand() * messages.length)]}`);
  }
  return out.join('\n') + '\n';
}
