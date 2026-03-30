/**
 * Validate cron expressions and return detailed diagnostics.
 */

export interface ValidationResult {
  valid: boolean;
  expression: string;
  errors: string[];
  fields?: {
    minute: string;
    hour: string;
    day: string;
    month: string;
    weekday: string;
  };
}

const FIELD_DEFS: { name: string; label: string; min: number; max: number }[] = [
  { name: 'minute', label: 'Minute', min: 0, max: 59 },
  { name: 'hour', label: 'Hour', min: 0, max: 23 },
  { name: 'day', label: 'Day of month', min: 1, max: 31 },
  { name: 'month', label: 'Month', min: 1, max: 12 },
  { name: 'weekday', label: 'Weekday', min: 0, max: 7 },
];

function validateField(raw: string, def: { name: string; label: string; min: number; max: number }): string[] {
  const errors: string[] = [];

  if (raw === '*') return errors;

  // */n
  if (raw.startsWith('*/')) {
    const step = parseInt(raw.slice(2), 10);
    if (isNaN(step) || step < 1) {
      errors.push(`${def.label}: invalid step value "${raw.slice(2)}"`);
    }
    return errors;
  }

  // Handle comma-separated values
  const parts = raw.split(',');
  for (const part of parts) {
    // range-step: n-m/s
    if (part.includes('-') && part.includes('/')) {
      const [rangePart, stepPart] = part.split('/');
      const [minStr, maxStr] = rangePart.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      const step = parseInt(stepPart, 10);
      if (isNaN(min) || isNaN(max) || isNaN(step)) {
        errors.push(`${def.label}: invalid range-step "${part}"`);
      } else {
        if (min < def.min || min > def.max) errors.push(`${def.label}: ${min} out of range [${def.min}-${def.max}]`);
        if (max < def.min || max > def.max) errors.push(`${def.label}: ${max} out of range [${def.min}-${def.max}]`);
        if (min > max) errors.push(`${def.label}: range start ${min} > end ${max}`);
        if (step < 1) errors.push(`${def.label}: step must be >= 1`);
      }
      continue;
    }

    // range: n-m
    if (part.includes('-')) {
      const [minStr, maxStr] = part.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      if (isNaN(min) || isNaN(max)) {
        errors.push(`${def.label}: invalid range "${part}"`);
      } else {
        if (min < def.min || min > def.max) errors.push(`${def.label}: ${min} out of range [${def.min}-${def.max}]`);
        if (max < def.min || max > def.max) errors.push(`${def.label}: ${max} out of range [${def.min}-${def.max}]`);
        if (min > max) errors.push(`${def.label}: range start ${min} > end ${max}`);
      }
      continue;
    }

    // single value
    const val = parseInt(part, 10);
    if (isNaN(val)) {
      errors.push(`${def.label}: invalid value "${part}"`);
    } else if (val < def.min || val > def.max) {
      errors.push(`${def.label}: ${val} out of range [${def.min}-${def.max}]`);
    }
  }

  return errors;
}

export function validate(expression: string): ValidationResult {
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5) {
    return {
      valid: false,
      expression,
      errors: [`Expected 5 fields, got ${parts.length}. Format: minute hour day month weekday`],
    };
  }

  const errors: string[] = [];
  for (let i = 0; i < 5; i++) {
    errors.push(...validateField(parts[i], FIELD_DEFS[i]));
  }

  return {
    valid: errors.length === 0,
    expression,
    errors,
    fields: {
      minute: parts[0],
      hour: parts[1],
      day: parts[2],
      month: parts[3],
      weekday: parts[4],
    },
  };
}
