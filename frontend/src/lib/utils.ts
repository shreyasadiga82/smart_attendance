/**
 * Utility functions for formatting, class merging, and date manipulation.
 */

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return typeof dateString === 'string' ? dateString : '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string | Date): string {
  if (!dateString) return '';
  if (typeof dateString === 'string') {
    const trimmed = dateString.trim();
    // Match "HH:MM"
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
    }
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return typeof dateString === 'string' ? dateString : '';
  }
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(dateString: string | Date): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return typeof dateString === 'string' ? dateString : '';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}
