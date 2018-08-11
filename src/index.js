// Dependencies
import program from 'commander';
import packageJson from '../package.json';
// Library
import { run as runGuides } from './guides';
import { run as runApi } from './api';


program
    .version(packageJson.version, '-v, --version')
    .description(packageJson.description)
    .option('-p, --project <project>', 'Project name. Accepts "api" or "guides"');

program.on('--help', function() {
    console.log(`
    Examples:
        $ yarn start -p api
        $ yarn start -p guides
    `);
});

program.parse(process.argv);

function cli() {
    switch (program.project) {
        case 'guides':
            return runGuides();
        case 'api':
            return runApi();
        default:
            throw new Error('Invalid --project property');
    }
}

cli();