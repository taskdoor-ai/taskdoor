/** First and last name initials; unspaced CJK names use the family-name character. */
export function personInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return "?";
  const first = Array.from(words[0])[0];
  if (words.length === 1) return first.toLocaleUpperCase();
  return (first + Array.from(words[words.length - 1])[0]).toLocaleUpperCase();
}
