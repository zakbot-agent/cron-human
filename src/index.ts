#!/usr/bin/env node

/**
 * cron-human — CLI entry point
 * Convert cron expressions to human-readable text and vice-versa.
 */

import { parseCron } from './parser';
import { humanize, Lang } from './humanizer';
import { reverseParse } from './reverse';
import { getNextExecutions } from './scheduler';
import { validate } from './validator';
import {
  formatFieldBreakdown,
  formatHumanResult,
  formatReverseResult,
  formatNextExecutions,
  formatValidation,
  formatExamples,
  formatError,
} from './formatter';
import { startServer } from './server';

function parseArgs(argv: string[]): {
  input?: string;
  lang: Lang;
  reverse: boolean;
  next?: number;
  examples: boolean;
  validate: boolean;
  serve: boolean;
  port: number;
  help: boolean;
} {
  const args = argv.slice(2);
  const result = {
    input: undefined as string | undefined,
    lang: 'en' as Lang,
    reverse: false,
    next: undefined as number | undefined,
    examples: false,
    validate: false,
    serve: false,
    port: 3457,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--lang' && i + 1 < args.length) {
      result.lang = args[++i] as Lang;
    } else if (arg === '--reverse') {
      result.reverse = true;
    } else if (arg === '--next' && i + 1 < args.length) {
      result.next = parseInt(args[++i], 10);
    } else if (arg === '--examples') {
      result.examples = true;
    } else if (arg === '--validate') {
      result.validate = true;
    } else if (arg === '--serve') {
      result.serve = true;
    } else if (arg === '--port' && i + 1 < args.length) {
      result.port = parseInt(args[++i], 10);
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('--')) {
      result.input = arg;
    }

    i++;
  }

  return result;
}

function showHelp(): void {
  const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
  };

  console.log(`
  ${C.bold}${C.cyan}cron-human${C.reset} — Cron expression translator (EN/FR)

  ${C.bold}Usage:${C.reset}
    cron-human ${C.green}"<cron-expr>"${C.reset}                   Convert cron to human text
    cron-human ${C.green}"<cron-expr>"${C.reset} --lang fr          French output
    cron-human --reverse ${C.green}"<text>"${C.reset}              Natural language to cron
    cron-human ${C.green}"<cron-expr>"${C.reset} --next 5           Show next 5 executions
    cron-human --validate ${C.green}"<cron-expr>"${C.reset}        Validate expression
    cron-human --examples                       Show common examples
    cron-human --serve                          Start web UI (port 3457)
    cron-human --serve --port 8080              Custom port

  ${C.bold}Options:${C.reset}
    --lang <en|fr>    Output language (default: en)
    --reverse         Convert natural language to cron
    --next <n>        Show next N execution times
    --validate        Validate a cron expression
    --examples        Show common cron examples
    --serve           Start web interface
    --port <n>        Web server port (default: 3457)
    --help, -h        Show this help
`);
}

function main(): void {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    return;
  }

  if (args.serve) {
    startServer(args.port);
    return;
  }

  if (args.examples) {
    console.log(formatExamples());
    return;
  }

  if (!args.input) {
    showHelp();
    process.exit(1);
  }

  const input = args.input as string;

  // Validate mode
  if (args.validate) {
    const result = validate(input);
    console.log(formatValidation(result));
    return;
  }

  // Reverse mode: natural language → cron
  if (args.reverse) {
    try {
      const cronExpr = reverseParse(input, args.lang);
      console.log(formatReverseResult(input, cronExpr));

      // Also show field breakdown of result
      const parsed = parseCron(cronExpr);
      console.log(formatFieldBreakdown(parsed));

      // Show next executions if requested
      if (args.next) {
        const dates = getNextExecutions(parsed, args.next);
        console.log(formatNextExecutions(dates, args.lang));
      }
    } catch (err: any) {
      console.log(formatError(err.message));
      process.exit(1);
    }
    return;
  }

  // Default: cron → human
  try {
    const parsed = parseCron(input);
    const human = humanize(parsed, args.lang);
    console.log(formatHumanResult(input, human));
    console.log(formatFieldBreakdown(parsed));

    // Show next executions
    const nextCount = args.next || 0;
    if (nextCount > 0) {
      const dates = getNextExecutions(parsed, nextCount);
      console.log(formatNextExecutions(dates, args.lang));
    }
  } catch (err: any) {
    console.log(formatError(err.message));
    process.exit(1);
  }
}

main();
