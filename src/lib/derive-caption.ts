// "GUEST ROOM - 2ND BEDROOM.HEIC" -> "Guest Room 2nd Bedroom" — admins
// already name their photos meaningfully before uploading; this carries
// that through as a starting caption instead of discarding it.
export function deriveCaptionFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return '';
  return spaced.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
