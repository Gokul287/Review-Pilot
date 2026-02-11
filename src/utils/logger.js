import chalk from 'chalk';
import ora from 'ora';

let activeSpinner = null;

// ─── Spinners ────────────────────────────────────────────────

export function startSpinner(text) {
    stopSpinner();
    activeSpinner = ora({ text, color: 'cyan' }).start();
    return activeSpinner;
}

export function succeedSpinner(text) {
    if (activeSpinner) {
        activeSpinner.succeed(text || activeSpinner.text);
        activeSpinner = null;
    }
}

export function failSpinner(text) {
    if (activeSpinner) {
        activeSpinner.fail(text || activeSpinner.text);
        activeSpinner = null;
    }
}

export function stopSpinner() {
    if (activeSpinner) {
        activeSpinner.stop();
        activeSpinner = null;
    }
}

// ─── Text Output ─────────────────────────────────────────────

export function heading(text) {
    console.log();
    console.log(chalk.bold.cyan(`  ✦ ${text}`));
    console.log(chalk.dim('  ' + '─'.repeat(50)));
}

export function success(text) {
    console.log(chalk.green(`  ✔ ${text}`));
}

export function warn(text) {
    console.log(chalk.yellow(`  ⚠ ${text}`));
}

export function error(text) {
    console.log(chalk.red(`  ✖ ${text}`));
}

export function info(text) {
    console.log(chalk.dim(`  ℹ ${text}`));
}

export function bullet(text, indent = 2) {
    const pad = ' '.repeat(indent);
    console.log(`${pad}${chalk.dim('•')} ${text}`);
}

// ─── Findings Table ──────────────────────────────────────────

const severityColors = {
    critical: chalk.bgRed.white.bold,
    error: chalk.red.bold,
    warning: chalk.yellow,
    info: chalk.blue,
    suggestion: chalk.dim,
};

export function finding(severity, file, line, message, source = '') {
    const badge = severityColors[severity]?.(` ${severity.toUpperCase()} `) || chalk.dim(severity);
    const loc = chalk.dim(`${file}${line ? `:${line}` : ''}`);
    const src = source ? chalk.dim(` [${source}]`) : '';
    console.log(`  ${badge} ${loc}  ${message}${src}`);
}

// ─── Dividers & Spacing ──────────────────────────────────────

export function divider() {
    console.log(chalk.dim('  ' + '═'.repeat(50)));
}

export function newline() {
    console.log();
}

// ─── Banner ──────────────────────────────────────────────────

export function banner() {
    console.log();
    console.log(chalk.bold.cyan('  ╔══════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('  ║') + chalk.bold.white('   🛩️  ReviewPilot — AI Code Review   ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('  ╚══════════════════════════════════════╝'));
    console.log();
}
