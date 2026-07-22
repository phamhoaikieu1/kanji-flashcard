// utils.ts
export function decodeUnicodeString(str: string): string {
  if (!str) return '';
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}