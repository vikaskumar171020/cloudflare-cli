#!/usr/bin/env node

import { createCli } from './cli.js';
import { Logger } from './utils/logger.js';

async function main() {
  const program = createCli();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    Logger.error('Execution failed', error);
    process.exit(1);
  }
}

main();
