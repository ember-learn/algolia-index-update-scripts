require = require('esm')(module)
const program = require('commander')

const { version, description } = require('./package.json')
const { runApi } = require('./lib/api')

program
  .version(version, '-v, --version')
  .description(description)
  .option(
    '-c, --clear-index',
    'Whether indexes of the project should be cleared while processing'
  )
  .option('-j, --json-driver', 'Use the json driver instead of algolia')

program.on('--help', function() {
  console.log(`
    Examples:
        $ yarn start
        $ yarn start -j # to write to fs
        $ yarn start -c # Clear indexes before populating content
    `)
})

program.parse(process.argv)

runApi(program.clearIndex, program.jsonDriver)
