/**
 * CLI color output and field breakdown formatting.
 */

import { ParsedCron } from './parser';
import { ValidationResult } from './validator';

// ANSI color codes
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

const FIELD_COLORS = [C.cyan, C.blue, C.magenta, C.green, C.yellow];
const FIELD_NAMES = ['Minute', 'Hour', 'Day', 'Month', 'Weekday'];
const FIELD_RANGES = ['0-59', '0-23', '1-31', '1-12', '0-7'];

export function formatFieldBreakdown(parsed: ParsedCron): string {
  const fields = [parsed.minute, parsed.hour, parsed.day, parsed.month, parsed.weekday];
  const lines: string[] = [];

  lines.push('');
  lines.push(`${C.bold}  Field Breakdown${C.reset}`);
  lines.push(`${C.dim}  ${'─'.repeat(50)}${C.reset}`);

  // Visual boxes
  const boxes = fields.map((f, i) => {
    return `${FIELD_COLORS[i]}${C.bold} ${f.raw.padEnd(6)} ${C.reset}`;
  });
  lines.push(`  ${boxes.join(' ')}`);

  // Labels
  const labels = FIELD_NAMES.map((name, i) => {
    return `${FIELD_COLORS[i]} ${name.padEnd(6)} ${C.reset}`;
  });
  lines.push(`  ${labels.join(' ')}`);

  // Details
  lines.push(`${C.dim}  ${'─'.repeat(50)}${C.reset}`);
  for (let i = 0; i < 5; i++) {
    const f = fields[i];
    let desc: string;
    switch (f.type) {
      case 'any': desc = 'every value'; break;
      case 'value': desc = `exactly ${f.values[0]}`; break;
      case 'step': desc = `every ${f.step}`; break;
      case 'range': desc = `from ${f.min} to ${f.max}`; break;
      case 'range-step': desc = `${f.min}-${f.max} every ${f.step}`; break;
      case 'list': desc = `values: ${f.values.join(', ')}`; break;
      default: desc = f.raw;
    }
    lines.push(`  ${FIELD_COLORS[i]}${FIELD_NAMES[i].padEnd(10)}${C.reset} ${C.dim}(${FIELD_RANGES[i]})${C.reset}  ${f.raw.padEnd(8)} → ${desc}`);
  }

  return lines.join('\n');
}

export function formatHumanResult(expression: string, humanText: string): string {
  return `\n  ${C.bold}${C.green}✓${C.reset} ${C.bold}${humanText}${C.reset}\n`;
}

export function formatReverseResult(input: string, cronExpr: string): string {
  return `\n  ${C.bold}${C.green}✓${C.reset} "${input}" ${C.dim}→${C.reset} ${C.bold}${C.cyan}${cronExpr}${C.reset}\n`;
}

export function formatNextExecutions(dates: Date[], lang: 'en' | 'fr' = 'en'): string {
  if (dates.length === 0) {
    return `\n  ${C.yellow}No upcoming executions found within the next year.${C.reset}\n`;
  }

  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${C.bold}Next ${dates.length} execution${dates.length > 1 ? 's' : ''}:${C.reset}`);

  const now = new Date();
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    const diff = d.getTime() - now.getTime();
    const relative = formatRelativeTime(diff, lang);

    const dateStr = formatDateStr(d, lang);
    const prefix = i === 0 ? C.green : C.dim;
    lines.push(`  ${prefix}${i === 0 ? '▸' : '○'} ${dateStr}${C.reset}  ${C.dim}(${relative})${C.reset}`);
  }

  return lines.join('\n');
}

function formatDateStr(d: Date, lang: string): string {
  const days: Record<string, string[]> = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
  };
  const months: Record<string, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  };
  const dayName = days[lang]?.[d.getDay()] ?? days['en'][d.getDay()];
  const monthName = months[lang]?.[d.getMonth()] ?? months['en'][d.getMonth()];
  const day = d.getDate().toString().padStart(2, ' ');
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${dayName} ${day} ${monthName} ${d.getFullYear()} ${h}:${m}`;
}

function formatRelativeTime(ms: number, lang: string): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lang === 'fr') {
    if (minutes < 60) return `dans ${minutes} min`;
    if (hours < 24) return `dans ${hours}h${minutes % 60 > 0 ? (minutes % 60).toString().padStart(2, '0') : ''}`;
    return `dans ${days}j ${hours % 24}h`;
  }

  if (minutes < 60) return `in ${minutes} min`;
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${days}d ${hours % 24}h`;
}

export function formatValidation(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push('');

  if (result.valid) {
    lines.push(`  ${C.green}${C.bold}✓ Valid cron expression${C.reset}`);
    if (result.fields) {
      lines.push(`  ${C.dim}${result.fields.minute} ${result.fields.hour} ${result.fields.day} ${result.fields.month} ${result.fields.weekday}${C.reset}`);
    }
  } else {
    lines.push(`  ${C.red}${C.bold}✗ Invalid cron expression${C.reset}`);
    for (const err of result.errors) {
      lines.push(`  ${C.red}  • ${err}${C.reset}`);
    }
  }

  return lines.join('\n');
}

export function formatExamples(): string {
  const examples = [
    { cron: '* * * * *', en: 'Every minute', fr: 'Chaque minute' },
    { cron: '*/5 * * * *', en: 'Every 5 minutes', fr: 'Toutes les 5 minutes' },
    { cron: '*/15 * * * *', en: 'Every 15 minutes', fr: 'Toutes les 15 minutes' },
    { cron: '0 * * * *', en: 'Every hour', fr: 'Chaque heure' },
    { cron: '0 */2 * * *', en: 'Every 2 hours', fr: 'Toutes les 2 heures' },
    { cron: '0 0 * * *', en: 'Every day at midnight', fr: 'Tous les jours à minuit' },
    { cron: '0 8 * * *', en: 'Every day at 8:00 AM', fr: 'Tous les jours à 08:00' },
    { cron: '0 12 * * *', en: 'Every day at noon', fr: 'Tous les jours à midi' },
    { cron: '30 9 * * 1-5', en: 'Weekdays at 9:30 AM', fr: 'En semaine à 9h30' },
    { cron: '0 8 * * 1', en: 'Every Monday at 8:00 AM', fr: 'Tous les lundis à 08:00' },
    { cron: '0 0 1 * *', en: 'First day of every month', fr: 'Le 1er de chaque mois' },
    { cron: '0 0 * * 0', en: 'Every Sunday at midnight', fr: 'Tous les dimanches à minuit' },
    { cron: '0 0 1 1 *', en: 'January 1st at midnight', fr: 'Le 1er janvier à minuit' },
    { cron: '0,30 * * * *', en: 'Every 30 minutes (on :00 and :30)', fr: 'Toutes les 30 min (:00 et :30)' },
  ];

  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${C.bold}Common Cron Examples${C.reset}`);
  lines.push(`  ${C.dim}${'─'.repeat(60)}${C.reset}`);
  lines.push(`  ${C.bold}${'Expression'.padEnd(18)} ${'English'.padEnd(30)} Français${C.reset}`);
  lines.push(`  ${C.dim}${'─'.repeat(60)}${C.reset}`);

  for (const ex of examples) {
    lines.push(`  ${C.cyan}${ex.cron.padEnd(18)}${C.reset} ${ex.en.padEnd(30)} ${C.dim}${ex.fr}${C.reset}`);
  }

  lines.push('');
  return lines.join('\n');
}

export function formatError(message: string): string {
  return `\n  ${C.red}${C.bold}✗ Error:${C.reset} ${C.red}${message}${C.reset}\n`;
}
