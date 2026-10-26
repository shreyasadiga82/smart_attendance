/**
 * Utility functions for formatting, class merging, and date manipulation.
 */

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string | Date): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}
