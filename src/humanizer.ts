/**
 * Converts parsed cron data to human-readable text in EN or FR.
 */

import { ParsedCron } from './parser';

export type Lang = 'en' | 'fr';

const WEEKDAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
};

const MONTHS: Record<Lang, string[]> = {
  en: ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  fr: ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTime(hour: number, minute: number, lang: Lang): string {
  if (lang === 'fr') {
    return `${pad(hour)}:${pad(minute)}`;
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return minute === 0 ? `${h12}:${pad(minute)} ${period}` : `${h12}:${pad(minute)} ${period}`;
}

function isAny(field: { type: string }): boolean {
  return field.type === 'any';
}

function isValue(field: { type: string }): boolean {
  return field.type === 'value';
}

export function humanize(parsed: ParsedCron, lang: Lang = 'en'): string {
  const { minute, hour, day, month, weekday } = parsed;

  // Every minute: * * * * *
  if (isAny(minute) && isAny(hour) && isAny(day) && isAny(month) && isAny(weekday)) {
    return lang === 'fr' ? 'Chaque minute' : 'Every minute';
  }

  // Every N minutes: */N * * * *
  if (minute.type === 'step' && isAny(hour) && isAny(day) && isAny(month) && isAny(weekday)) {
    return lang === 'fr'
      ? `Toutes les ${minute.step} minutes`
      : `Every ${minute.step} minutes`;
  }

  // Every N hours: 0 */N * * *
  if (isValue(minute) && hour.type === 'step' && isAny(day) && isAny(month) && isAny(weekday)) {
    const m = minute.values[0];
    if (m === 0) {
      return lang === 'fr'
        ? `Toutes les ${hour.step} heures`
        : `Every ${hour.step} hours`;
    }
    return lang === 'fr'
      ? `Toutes les ${hour.step} heures à la minute ${m}`
      : `Every ${hour.step} hours at minute ${m}`;
  }

  // Hourly: 0 * * * *
  if (isValue(minute) && minute.values[0] === 0 && isAny(hour) && isAny(day) && isAny(month) && isAny(weekday)) {
    return lang === 'fr' ? 'Chaque heure' : 'Every hour';
  }

  // At specific minute each hour: N * * * *
  if (isValue(minute) && isAny(hour) && isAny(day) && isAny(month) && isAny(weekday)) {
    return lang === 'fr'
      ? `Chaque heure à la minute ${minute.values[0]}`
      : `Every hour at minute ${minute.values[0]}`;
  }

  // Build time string for specific hour+minute
  const hasSpecificTime = isValue(minute) && isValue(hour);
  const timeStr = hasSpecificTime
    ? formatTime(hour.values[0], minute.values[0], lang)
    : '';

  // Specific weekday(s)
  if (hasSpecificTime && isAny(day) && isAny(month) && !isAny(weekday)) {
    const days = weekday.values.map(d => WEEKDAYS[lang][d % 7 === 0 ? 0 : d]);
    if (weekday.type === 'value') {
      const dayName = WEEKDAYS[lang][weekday.values[0] % 7 === 0 ? 0 : weekday.values[0]];
      return lang === 'fr'
        ? `Tous les ${dayName}s à ${timeStr}`
        : `Every ${dayName} at ${timeStr}`;
    }
    if (weekday.type === 'range') {
      const from = WEEKDAYS[lang][weekday.min! % 7 === 0 ? 0 : weekday.min!];
      const to = WEEKDAYS[lang][weekday.max! % 7 === 0 ? 0 : weekday.max!];
      return lang === 'fr'
        ? `Du ${from} au ${to} à ${timeStr}`
        : `${from} through ${to} at ${timeStr}`;
    }
    return lang === 'fr'
      ? `Les ${days.join(', ')} à ${timeStr}`
      : `On ${days.join(', ')} at ${timeStr}`;
  }

  // Daily: specific time, all days
  if (hasSpecificTime && isAny(day) && isAny(month) && isAny(weekday)) {
    return lang === 'fr'
      ? `Tous les jours à ${timeStr}`
      : `Every day at ${timeStr}`;
  }

  // Monthly: specific day of month
  if (hasSpecificTime && isValue(day) && isAny(month) && isAny(weekday)) {
    const d = day.values[0];
    const ordinal = getOrdinal(d, lang);
    return lang === 'fr'
      ? `Le ${d} de chaque mois à ${timeStr}`
      : `On the ${ordinal} of every month at ${timeStr}`;
  }

  // Specific month + day
  if (hasSpecificTime && isValue(day) && isValue(month) && isAny(weekday)) {
    const d = day.values[0];
    const m = MONTHS[lang][month.values[0]];
    return lang === 'fr'
      ? `Le ${d} ${m} à ${timeStr}`
      : `On ${m} ${getOrdinal(d, lang)} at ${timeStr}`;
  }

  // Weekday range with any time
  if (isAny(minute) && isAny(hour) && isAny(day) && isAny(month) && !isAny(weekday)) {
    const days = weekday.values.map(d => WEEKDAYS[lang][d % 7 === 0 ? 0 : d]);
    return lang === 'fr'
      ? `Chaque minute les ${days.join(', ')}`
      : `Every minute on ${days.join(', ')}`;
  }

  // Fallback: build a descriptive string
  return buildGenericDescription(parsed, lang);
}

function getOrdinal(n: number, lang: Lang): string {
  if (lang === 'fr') return `${n}${n === 1 ? 'er' : 'e'}`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function buildGenericDescription(parsed: ParsedCron, lang: Lang): string {
  const parts: string[] = [];
  const { minute, hour, day, month, weekday } = parsed;

  // Minute part
  if (minute.type === 'step') {
    parts.push(lang === 'fr' ? `toutes les ${minute.step} min` : `every ${minute.step} min`);
  } else if (isValue(minute)) {
    parts.push(lang === 'fr' ? `à la minute ${minute.values[0]}` : `at minute ${minute.values[0]}`);
  } else if (minute.type === 'list') {
    parts.push(lang === 'fr' ? `aux minutes ${minute.values.join(', ')}` : `at minutes ${minute.values.join(', ')}`);
  }

  // Hour part
  if (hour.type === 'step') {
    parts.push(lang === 'fr' ? `toutes les ${hour.step}h` : `every ${hour.step} hours`);
  } else if (isValue(hour)) {
    parts.push(lang === 'fr' ? `à ${pad(hour.values[0])}h` : `at hour ${hour.values[0]}`);
  } else if (hour.type === 'list') {
    parts.push(lang === 'fr' ? `aux heures ${hour.values.join(', ')}` : `at hours ${hour.values.join(', ')}`);
  } else if (hour.type === 'range') {
    parts.push(lang === 'fr' ? `de ${hour.min}h à ${hour.max}h` : `from ${hour.min}:00 to ${hour.max}:00`);
  }

  // Day part
  if (isValue(day)) {
    parts.push(lang === 'fr' ? `le ${day.values[0]}` : `on day ${day.values[0]}`);
  } else if (day.type === 'list') {
    parts.push(lang === 'fr' ? `les jours ${day.values.join(', ')}` : `on days ${day.values.join(', ')}`);
  }

  // Month part
  if (isValue(month)) {
    parts.push(lang === 'fr' ? `en ${MONTHS[lang][month.values[0]]}` : `in ${MONTHS[lang][month.values[0]]}`);
  } else if (month.type === 'list') {
    const names = month.values.map(v => MONTHS[lang][v]);
    parts.push(lang === 'fr' ? `en ${names.join(', ')}` : `in ${names.join(', ')}`);
  }

  // Weekday part
  if (!isAny(weekday)) {
    const days = weekday.values.map(d => WEEKDAYS[lang][d % 7 === 0 ? 0 : d]);
    parts.push(lang === 'fr' ? `les ${days.join(', ')}` : `on ${days.join(', ')}`);
  }

  if (parts.length === 0) {
    return lang === 'fr' ? 'Expression cron complexe' : 'Complex cron expression';
  }

  const sentence = parts.join(', ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
