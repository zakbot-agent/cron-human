/**
 * Calculate next N execution dates from a parsed cron expression.
 */

import { ParsedCron } from './parser';

function fieldMatches(value: number, field: { type: string; values: number[] }): boolean {
  if (field.type === 'any') return true;
  // Weekday special: 0 and 7 both mean Sunday
  return field.values.includes(value);
}

function weekdayMatches(value: number, field: { type: string; values: number[] }): boolean {
  if (field.type === 'any') return true;
  // Normalize: 7 → 0 for Sunday
  const normalized = field.values.map(v => v === 7 ? 0 : v);
  const check = value === 7 ? 0 : value;
  return normalized.includes(check);
}

export function getNextExecutions(parsed: ParsedCron, count: number, from?: Date): Date[] {
  const results: Date[] = [];
  const now = from ? new Date(from) : new Date();

  // Start from the next minute
  const current = new Date(now);
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  const maxIterations = 525600; // 1 year of minutes
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    const minute = current.getMinutes();
    const hour = current.getHours();
    const dayOfMonth = current.getDate();
    const month = current.getMonth() + 1; // 1-indexed
    const weekday = current.getDay(); // 0=Sunday

    if (
      fieldMatches(minute, parsed.minute) &&
      fieldMatches(hour, parsed.hour) &&
      fieldMatches(dayOfMonth, parsed.day) &&
      fieldMatches(month, parsed.month) &&
      weekdayMatches(weekday, parsed.weekday)
    ) {
      results.push(new Date(current));
    }

    current.setMinutes(current.getMinutes() + 1);
    iterations++;
  }

  return results;
}

export function formatDate(date: Date, lang: 'en' | 'fr' = 'en'): string {
  const days: Record<string, string[]> = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  };
  const months: Record<string, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  };

  const dayName = days[lang][date.getDay()];
  const monthName = months[lang][date.getMonth()];
  const d = date.getDate();
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const y = date.getFullYear();

  return `${dayName} ${d} ${monthName} ${y} ${h}:${m}`;
}
