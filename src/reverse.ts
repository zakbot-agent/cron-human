/**
 * Natural language to cron expression converter (EN + FR).
 */

export type Lang = 'en' | 'fr';

interface Pattern {
  regex: RegExp;
  handler: (match: RegExpMatchArray) => string;
}

const WEEKDAY_MAP_EN: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const WEEKDAY_MAP_FR: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

function parseTimeEN(timeStr: string): [number, number] {
  // Handle "8am", "8:30pm", "14:00", "8:00 am"
  const cleaned = timeStr.replace(/\s+/g, '').toLowerCase();

  const match12 = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    if (match12[3] === 'pm' && h < 12) h += 12;
    if (match12[3] === 'am' && h === 12) h = 0;
    return [h, m];
  }

  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return [parseInt(match24[1], 10), parseInt(match24[2], 10)];
  }

  const matchHour = cleaned.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (matchHour) {
    return [parseInt(matchHour[1], 10), matchHour[2] ? parseInt(matchHour[2], 10) : 0];
  }

  throw new Error(`Cannot parse time: ${timeStr}`);
}

function parseTimeFR(timeStr: string): [number, number] {
  const cleaned = timeStr.replace(/\s+/g, '').toLowerCase();

  const matchH = cleaned.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (matchH) {
    return [parseInt(matchH[1], 10), matchH[2] ? parseInt(matchH[2], 10) : 0];
  }

  const matchColon = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (matchColon) {
    return [parseInt(matchColon[1], 10), parseInt(matchColon[2], 10)];
  }

  const matchPlain = cleaned.match(/^(\d{1,2})$/);
  if (matchPlain) {
    return [parseInt(matchPlain[1], 10), 0];
  }

  throw new Error(`Impossible d'analyser l'heure: ${timeStr}`);
}

function buildEnglishPatterns(): Pattern[] {
  return [
    // "every minute"
    {
      regex: /^every\s+minute$/i,
      handler: () => '* * * * *',
    },
    // "every N minutes"
    {
      regex: /^every\s+(\d+)\s+minutes?$/i,
      handler: (m) => `*/${m[1]} * * * *`,
    },
    // "every N hours"
    {
      regex: /^every\s+(\d+)\s+hours?$/i,
      handler: (m) => `0 */${m[1]} * * *`,
    },
    // "hourly"
    {
      regex: /^hourly$/i,
      handler: () => '0 * * * *',
    },
    // "daily" or "every day"
    {
      regex: /^(?:daily|every\s+day)$/i,
      handler: () => '0 0 * * *',
    },
    // "weekly"
    {
      regex: /^weekly$/i,
      handler: () => '0 0 * * 0',
    },
    // "monthly"
    {
      regex: /^monthly$/i,
      handler: () => '0 0 1 * *',
    },
    // "at midnight"
    {
      regex: /^at\s+midnight$/i,
      handler: () => '0 0 * * *',
    },
    // "at noon"
    {
      regex: /^at\s+noon$/i,
      handler: () => '0 12 * * *',
    },
    // "every day at midnight"
    {
      regex: /^every\s+day\s+at\s+midnight$/i,
      handler: () => '0 0 * * *',
    },
    // "every day at noon"
    {
      regex: /^every\s+day\s+at\s+noon$/i,
      handler: () => '0 12 * * *',
    },
    // "every day at HH:MM" or "every day at Ham/pm"
    {
      regex: /^every\s+day\s+at\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeEN(m[1]);
        return `${min} ${h} * * *`;
      },
    },
    // "every <weekday> at <time>"
    {
      regex: /^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s+at\s+(.+)$/i,
      handler: (m) => {
        const day = WEEKDAY_MAP_EN[m[1].toLowerCase()];
        const [h, min] = parseTimeEN(m[2]);
        return `${min} ${h} * * ${day}`;
      },
    },
    // "every month on day N" or "every month on the Nth"
    {
      regex: /^every\s+month\s+on\s+(?:day\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?$/i,
      handler: (m) => `0 0 ${m[1]} * *`,
    },
    // "every month on day N at <time>"
    {
      regex: /^every\s+month\s+on\s+(?:day\s+)?(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s+at\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeEN(m[2]);
        return `${min} ${h} ${m[1]} * *`;
      },
    },
    // "every weekday at <time>" (Mon-Fri)
    {
      regex: /^every\s+weekday\s+at\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeEN(m[1]);
        return `${min} ${h} * * 1-5`;
      },
    },
  ];
}

function buildFrenchPatterns(): Pattern[] {
  const weekdayRegex = Object.keys(WEEKDAY_MAP_FR).join('|');

  return [
    // "chaque minute" / "toutes les minutes"
    {
      regex: /^(?:chaque\s+minute|toutes\s+les\s+minutes)$/i,
      handler: () => '* * * * *',
    },
    // "toutes les N minutes"
    {
      regex: /^toutes\s+les\s+(\d+)\s+minutes?$/i,
      handler: (m) => `*/${m[1]} * * * *`,
    },
    // "toutes les N heures"
    {
      regex: /^toutes\s+les\s+(\d+)\s+heures?$/i,
      handler: (m) => `0 */${m[1]} * * *`,
    },
    // "chaque heure"
    {
      regex: /^chaque\s+heure$/i,
      handler: () => '0 * * * *',
    },
    // "quotidien" / "tous les jours"
    {
      regex: /^(?:quotidien|tous\s+les\s+jours)$/i,
      handler: () => '0 0 * * *',
    },
    // "hebdomadaire"
    {
      regex: /^hebdomadaire$/i,
      handler: () => '0 0 * * 0',
    },
    // "mensuel"
    {
      regex: /^mensuel$/i,
      handler: () => '0 0 1 * *',
    },
    // "à minuit"
    {
      regex: /^[àa]\s+minuit$/i,
      handler: () => '0 0 * * *',
    },
    // "à midi"
    {
      regex: /^[àa]\s+midi$/i,
      handler: () => '0 12 * * *',
    },
    // "tous les jours à minuit"
    {
      regex: /^tous\s+les\s+jours\s+[àa]\s+minuit$/i,
      handler: () => '0 0 * * *',
    },
    // "tous les jours à midi"
    {
      regex: /^tous\s+les\s+jours\s+[àa]\s+midi$/i,
      handler: () => '0 12 * * *',
    },
    // "tous les jours à HH:MM" / "tous les jours à Hh"
    {
      regex: /^tous\s+les\s+jours\s+[àa]\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeFR(m[1]);
        return `${min} ${h} * * *`;
      },
    },
    // "tous les <weekday>s à <time>" or "tous les <weekday> à <time>"
    {
      regex: new RegExp(`^tous\\s+les\\s+(${weekdayRegex})s?\\s+[àa]\\s+(.+)$`, 'i'),
      handler: (m) => {
        const day = WEEKDAY_MAP_FR[m[1].toLowerCase()];
        const [h, min] = parseTimeFR(m[2]);
        return `${min} ${h} * * ${day}`;
      },
    },
    // "chaque mois le N"
    {
      regex: /^chaque\s+mois\s+le\s+(\d+)$/i,
      handler: (m) => `0 0 ${m[1]} * *`,
    },
    // "chaque mois le N à <time>"
    {
      regex: /^chaque\s+mois\s+le\s+(\d+)\s+[àa]\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeFR(m[2]);
        return `${min} ${h} ${m[1]} * *`;
      },
    },
    // "en semaine à <time>" (Lun-Ven)
    {
      regex: /^en\s+semaine\s+[àa]\s+(.+)$/i,
      handler: (m) => {
        const [h, min] = parseTimeFR(m[1]);
        return `${min} ${h} * * 1-5`;
      },
    },
  ];
}

export function reverseParse(input: string, lang: Lang = 'en'): string {
  const text = input.trim();
  const patterns = lang === 'fr' ? buildFrenchPatterns() : buildEnglishPatterns();

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return pattern.handler(match);
    }
  }

  throw new Error(
    lang === 'fr'
      ? `Expression non reconnue: "${text}"`
      : `Unrecognized expression: "${text}"`
  );
}
