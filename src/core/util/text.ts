export function capitalize(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}

export function titleCase(value: string): string {
  const minor = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o']);
  return value
    .split(' ')
    .map((word, index) => (index > 0 && minor.has(word.toLowerCase()) ? word.toLowerCase() : capitalize(word)))
    .join(' ');
}

export function pluralize(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatGold(value: number): string {
  return value >= 10000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
}

export function joinList(items: string[], conjunction = 'e'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}
