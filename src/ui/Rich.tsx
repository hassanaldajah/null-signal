/** Player-facing text without its `code` marks (for typewriters and length checks). */
export function plainText(text: string): string {
  return text.replace(/`([^`]+)`/g, '$1');
}

/**
 * Renders text where `backticks` mark commands, paths and values. Each marked span becomes
 * left-to-right, isolated code, so `/var/log` or `ls -a` keeps its order inside an Arabic sentence.
 * `limit` shows only the first N visible characters (typewriter).
 */
export default function Rich({ text, limit }: { text: string; limit?: number }) {
  let left = limit ?? Infinity;
  return (
    <>
      {text.split(/`([^`]+)`/g).map((part, index) => {
        if (left <= 0 || !part) return null;
        const shown = part.slice(0, left);
        left -= shown.length;
        return index % 2 ? <code key={index} className="inline-code">{shown}</code> : shown;
      })}
    </>
  );
}
