require = require('esm')(module)
const program = require('commander')

const { version, description } = require('./package.json')
const { run: runGuides } = require('./lib/guides')
const { run: runApi } = require('./lib/api')

program
  .version(version, '-v, --version')
  .description(description)
  .option('-p, --project <project>', 'Project name. Accepts "api" or "guides"')
  .option(
    '-c, --clear-index',
    'Whether indexes of the project should be cleared while processing'
  )

program.on('--help', function() {
  console.log(`
    Examples:
        $ yarn start -p api
        $ yarn start -p guides
    `)
})

program.parse(process.argv)

switch (program.project) {
  case 'guides':
    runGuides()
    break
  case 'api':
    runApi(program.clearIndex)
    break
  default:
    throw new Error('Invalid --project property')
}
