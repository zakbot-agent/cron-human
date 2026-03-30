/**
 * Cron expression parser — parses 5-field cron into structured data.
 * Fields: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-7)
 */

export interface CronField {
  raw: string;
  type: 'any' | 'value' | 'range' | 'step' | 'list' | 'range-step';
  values: number[];
  step?: number;
  min?: number;
  max?: number;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  day: CronField;
  month: CronField;
  weekday: CronField;
  raw: string;
}

const FIELD_RANGES: Record<string, [number, number]> = {
  minute: [0, 59],
  hour: [0, 23],
  day: [1, 31],
  month: [1, 12],
  weekday: [0, 7],
};

function expandRange(min: number, max: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = min; i <= max; i += step) {
    result.push(i);
  }
  return result;
}

function parseField(raw: string, fieldName: string): CronField {
  const [rangeMin, rangeMax] = FIELD_RANGES[fieldName];

  // Any: *
  if (raw === '*') {
    return { raw, type: 'any', values: expandRange(rangeMin, rangeMax) };
  }

  // Step: */n
  if (raw.startsWith('*/')) {
    const step = parseInt(raw.slice(2), 10);
    if (isNaN(step) || step < 1) throw new Error(`Invalid step in field "${fieldName}": ${raw}`);
    return { raw, type: 'step', values: expandRange(rangeMin, rangeMax, step), step };
  }

  // List: n,m,...
  if (raw.includes(',')) {
    const parts = raw.split(',');
    const values: number[] = [];
    for (const p of parts) {
      const v = parseInt(p.trim(), 10);
      if (isNaN(v)) throw new Error(`Invalid value in list for "${fieldName}": ${p}`);
      values.push(v);
    }
    values.sort((a, b) => a - b);
    return { raw, type: 'list', values };
  }

  // Range with step: n-m/s
  if (raw.includes('-') && raw.includes('/')) {
    const [rangePart, stepPart] = raw.split('/');
    const [minStr, maxStr] = rangePart.split('-');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    const step = parseInt(stepPart, 10);
    if (isNaN(min) || isNaN(max) || isNaN(step)) {
      throw new Error(`Invalid range-step in field "${fieldName}": ${raw}`);
    }
    return { raw, type: 'range-step', values: expandRange(min, max, step), step, min, max };
  }

  // Range: n-m
  if (raw.includes('-')) {
    const [minStr, maxStr] = raw.split('-');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (isNaN(min) || isNaN(max)) {
      throw new Error(`Invalid range in field "${fieldName}": ${raw}`);
    }
    return { raw, type: 'range', values: expandRange(min, max), min, max };
  }

  // Specific value: n
  const value = parseInt(raw, 10);
  if (isNaN(value)) throw new Error(`Invalid value in field "${fieldName}": ${raw}`);
  return { raw, type: 'value', values: [value] };
}

export function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`);
  }

  return {
    minute: parseField(parts[0], 'minute'),
    hour: parseField(parts[1], 'hour'),
    day: parseField(parts[2], 'day'),
    month: parseField(parts[3], 'month'),
    weekday: parseField(parts[4], 'weekday'),
    raw: expression.trim(),
  };
}
