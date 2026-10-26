// Hostile-input test for the simulated shell: every line must return a result, never throw or hang.
// Run: npm run fuzz
import { Shell } from '../src/engine/shell/shell';
import { Vfs } from '../src/engine/vfs';
import level from '../src/levels/act5/l22';

const shell = new Shell(new Vfs(level.world), { user: 'a', host: 'h', cwd: level.world.cwd, now: new Date(level.world.now!) });
const BS = String.fromCharCode(92);
const inputs = [
  'ls *[', 'ls [z-a]*', 'find / -name "[z-a]"', 'find / -name "*["', 'find / -iname "[b-a]*"', 'ls ?(', `cat *${BS}`, 'ls *]',
  'date -d @99999999999999999', 'date -d @abc', 'date -d @-1e30', 'date -d @', 'date -d', 'date -u -d @1e400',
  'cut -d " " -f 1-999999999 .bashrc', 'cut -f 0 .bashrc', 'cut -d "" -f 1 .bashrc', 'cut -f 9999999999999999-1 .bashrc', 'cut -f a-b .bashrc',
  'sort -k 999999 .bashrc', 'sort -t "" -k 1 .bashrc', 'sort -k -1 .bashrc',
  'grep -E "(a+)+" .bashrc', 'grep "[" .bashrc', `grep -E "${BS}" .bashrc`, 'grep -c', 'grep -e', 'grep -E "a{99999}" .bashrc', 'grep -E "(?<=a)b" .bashrc',
  'xxd -l 999999999 .bashrc', 'xxd -s 99999999999 .bashrc', 'xxd -l -5 .bashrc', 'xxd -s abc .bashrc',
  'head -n -5 .bashrc', 'tail -n +0 .bashrc', 'head -n 99999999999999999999 .bashrc', 'wc', 'uniq -c',
  'find / -mtime abc', 'find / -newermt garbage', 'find / -perm 99999', 'find / -perm -abc', 'find / -type', 'find / -mtime', 'find / -user',
  'exiftool -n', 'exiftool .', 'exiftool -', 'strings -n 0 .bashrc', 'strings -n abc .bashrc', 'base64 -d .bashrc', 'echo AAAA | base64 -d',
  'echo $((1+1))', 'echo "$(id)"', 'echo `id`', 'cd ../../../../..', 'cd', 'cd -', 'cd -', 'cd /nonexistent',
  'cat /dev/zero', 'ls -la / | grep x | sort | uniq -c | sort -n', 'echo __proto__ | sort', 'crontab -l -u __proto__', 'crontab -l -u ../../etc/passwd',
  'man __proto__', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'man constructor', 'hashid __proto__', 'hashid',
  'sha256sum *', 'md5sum', 'file *', 'file', 'cat "unterminated', "cat 'x", 'ls |', '| ls', 'ls > x', 'ls >', 'ls >> /etc/passwd', "'", BS, '$', '$HOME$HOME',
  'history', 'a'.repeat(5000), 'ls ' + '*'.repeat(200), 'grep ' + '.*'.repeat(100) + ' .bashrc', 'find / -name "' + '*a'.repeat(60) + 'b"',
  'cat .local/share/Trash/files/* | strings | sort | uniq -c', 'ls -la .local/share/Trash/files/*', 'exiftool .local/share/Trash/files/*',
];
let failures = 0;
for (const line of inputs) {
  const started = performance.now();
  try {
    const result = shell.run(line);
    if (typeof result.out !== 'string') throw new Error('no output string');
  } catch (error) {
    failures++;
    console.log(`THROWS  ${line.slice(0, 60)}  ->  ${(error as Error).message.split('\n')[0]}`);
  }
  const ms = performance.now() - started;
  if (ms > 200) failures++;
  if (ms > 200) console.log(`SLOW    ${line.slice(0, 60)}  ->  ${ms.toFixed(0)} ms`);
}
console.log(`${inputs.length} hostile inputs, ${failures} threw`);
process.exit(failures ? 1 : 0);
