import program from 'commander';

import { runApi } from './lib/api.js';

program
  .option('-c, --clear-index', 'Whether indexes of the project should be cleared while processing')
  .option('-j, --json-driver', 'Use the json driver instead of algolia');

program.on('--help', function () {
  console.log(`
    Examples:
        $ npm start
        $ npm start -- -j # to write to fs
        $ npm start -- -c # Clear indexes before populating content
    `);
});

program.parse(process.argv);

runApi(program.clearIndex, program.jsonDriver);
