/**
 * Web server for cron-human — serves the UI and API on the given port.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { parseCron } from './parser';
import { humanize, Lang } from './humanizer';
import { reverseParse } from './reverse';
import { getNextExecutions } from './scheduler';
import { validate } from './validator';

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };
  return types[ext] || 'text/plain';
}

function jsonResponse(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function handleAPI(req: http.IncomingMessage, res: http.ServerResponse, urlObj: URL): boolean {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }

  const pathname = urlObj.pathname;

  // GET /api/parse?expr=...&lang=en
  if (pathname === '/api/parse' && req.method === 'GET') {
    const expr = urlObj.searchParams.get('expr') || '';
    const lang = (urlObj.searchParams.get('lang') || 'en') as Lang;
    const next = parseInt(urlObj.searchParams.get('next') || '5', 10);

    try {
      const parsed = parseCron(expr);
      const human = humanize(parsed, lang);
      const validation = validate(expr);
      const executions = getNextExecutions(parsed, next);

      jsonResponse(res, {
        success: true,
        expression: expr,
        human,
        lang,
        valid: validation.valid,
        fields: {
          minute: { raw: parsed.minute.raw, type: parsed.minute.type },
          hour: { raw: parsed.hour.raw, type: parsed.hour.type },
          day: { raw: parsed.day.raw, type: parsed.day.type },
          month: { raw: parsed.month.raw, type: parsed.month.type },
          weekday: { raw: parsed.weekday.raw, type: parsed.weekday.type },
        },
        nextExecutions: executions.map(d => d.toISOString()),
      });
    } catch (err: any) {
      jsonResponse(res, { success: false, error: err.message }, 400);
    }
    return true;
  }

  // GET /api/reverse?text=...&lang=en
  if (pathname === '/api/reverse' && req.method === 'GET') {
    const text = urlObj.searchParams.get('text') || '';
    const lang = (urlObj.searchParams.get('lang') || 'en') as Lang;

    try {
      const cron = reverseParse(text, lang);
      const parsed = parseCron(cron);
      const human = humanize(parsed, lang);
      const executions = getNextExecutions(parsed, 5);

      jsonResponse(res, {
        success: true,
        input: text,
        cron,
        human,
        lang,
        fields: {
          minute: { raw: parsed.minute.raw, type: parsed.minute.type },
          hour: { raw: parsed.hour.raw, type: parsed.hour.type },
          day: { raw: parsed.day.raw, type: parsed.day.type },
          month: { raw: parsed.month.raw, type: parsed.month.type },
          weekday: { raw: parsed.weekday.raw, type: parsed.weekday.type },
        },
        nextExecutions: executions.map(d => d.toISOString()),
      });
    } catch (err: any) {
      jsonResponse(res, { success: false, error: err.message }, 400);
    }
    return true;
  }

  // GET /api/validate?expr=...
  if (pathname === '/api/validate' && req.method === 'GET') {
    const expr = urlObj.searchParams.get('expr') || '';
    const result = validate(expr);
    jsonResponse(res, result);
    return true;
  }

  return false;
}

export function startServer(port: number = 3457): void {
  const publicDir = path.resolve(__dirname, '..', 'public');

  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const urlObj = new URL(req.url || '/', `http://localhost:${port}`);

    // API routes
    if (urlObj.pathname.startsWith('/api/')) {
      if (handleAPI(req, res, urlObj)) return;
      jsonResponse(res, { error: 'Not found' }, 404);
      return;
    }

    // Static files
    let filePath = path.join(publicDir, urlObj.pathname === '/' ? 'index.html' : urlObj.pathname);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
      if (err) {
        // Fallback to index.html for SPA
        fs.readFile(path.join(publicDir, 'index.html'), (err2: NodeJS.ErrnoException | null, data2: Buffer) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': getContentType(ext) });
      res.end(data);
    });
  });

  server.listen(port, () => {
    console.log(`\x1b[1m\x1b[32m✓\x1b[0m cron-human web UI running at \x1b[1m\x1b[36mhttp://localhost:${port}\x1b[0m`);
    console.log(`\x1b[2m  Press Ctrl+C to stop\x1b[0m`);
  });
}
