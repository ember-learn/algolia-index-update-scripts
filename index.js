require = require("esm")(module);
const program = require("commander");

const { version, description } = require("./package.json");
const { run: runGuides } = require("./src/guides");
const { run: runApi } = require("./src/api");

program
  .version(version, "-v, --version")
  .description(description)
  .option("-p, --project <project>", 'Project name. Accepts "api" or "guides"');

program.on("--help", function() {
  console.log(`
    Examples:
        $ yarn start -p api
        $ yarn start -p guides
    `);
});

program.parse(process.argv);

switch (program.project) {
  case "guides":
    runGuides();
    break;
  case "api":
    runApi();
    break;
  default:
    throw new Error("Invalid --project property");
}
