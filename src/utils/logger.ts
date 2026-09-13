import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export class Logger {
  private static isVerbose = false;

  public static setVerbose(verbose: boolean) {
    this.isVerbose = verbose;
  }

  public static info(message: string) {
    console.log(chalk.blue('ℹ'), message);
  }

  public static success(message: string) {
    console.log(chalk.green('✔'), message);
  }

  public static warn(message: string) {
    console.log(chalk.yellow('⚠'), message);
  }

  public static error(message: string, error?: unknown) {
    console.error(chalk.red('✖'), chalk.red(message));
    if (this.isVerbose && error) {
      console.error(chalk.dim(error instanceof Error ? error.stack : String(error)));
    }
  }

  public static debug(message: string, data?: unknown) {
    if (this.isVerbose) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      if (data !== undefined) {
        console.dir(data, { depth: null, colors: true });
      }
    }
  }

  public static spinner(message: string): Ora {
    return ora({
      text: message,
      color: 'cyan',
    }).start();
  }

  public static table(data: Record<string, unknown>[]) {
    if (!data || data.length === 0) {
      console.log(chalk.dim('No records found.'));
      return;
    }
    console.table(data);
  }

  public static json(data: unknown) {
    console.log(JSON.stringify(data, null, 2));
  }
}
