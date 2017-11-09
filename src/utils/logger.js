import chalk from 'chalk';

export function logGreen() {
    console.log(chalk.green(...arguments));
}
export function logBlue() {
    console.log(chalk.blue(...arguments));
}
export function logRed() {
    console.log(chalk.red(...arguments));
}
export default {
    logGreen,
    logBlue,
    logRed
};