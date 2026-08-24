// Falls back to carpet area when built-up/super area was never entered, so
// a listing card always shows *some* area figure instead of silently
// dropping the whole area line. Built-up area is preferred when both exist
// since it's the more commonly advertised figure.
export function resolveAreaLabel(property: { built_up_area?: number | string | null; carpet_area?: number | string | null }): string {
  const area = property.built_up_area || property.carpet_area;
  return area ? `${Number(area).toLocaleString()} sq.ft.` : '';
}
