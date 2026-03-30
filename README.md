# cron-human

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![License](https://img.shields.io/badge/license-MIT-green.svg) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)

> Convert cron expressions to human-readable text (FR/EN) and vice-versa

## Features

- CLI tool
- TypeScript support

## Tech Stack

**Runtime:**
- TypeScript v6.0.2

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn

## Installation

```bash
cd cron-human
npm install
```

Or install globally:

```bash
npm install -g cron-human
```

## Usage

### CLI

```bash
cron-human
```

### Available Scripts

| Script | Command |
|--------|---------|
| `npm run build` | `tsc` |
| `npm run start` | `node dist/index.js` |

## Project Structure

```
├── public
│   └── index.html
├── src
│   ├── formatter.ts
│   ├── humanizer.ts
│   ├── index.ts
│   ├── parser.ts
│   ├── reverse.ts
│   ├── scheduler.ts
│   ├── server.ts
│   └── validator.ts
├── package.json
├── README.md
└── tsconfig.json
```

## License

This project is licensed under the **MIT** license.

## Author

**Zakaria Kone**
