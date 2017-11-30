import chalk from 'chalk';

/**
 * Outputs green text to the console
 */
export function logGreen() {
    console.log(chalk.green(...arguments));
}
/**
 * Outputs blue text to the console
 */
export function logBlue() {
    console.log(chalk.blue(...arguments));
}
/**
 * Outputs red text to the console
 */
export function logRed() {
    console.log(chalk.red(...arguments));
}

export default {
    logGreen,
    logBlue,
    logRed
};