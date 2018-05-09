# Algolia API docs indexing script

## Getting started

Because of AWS rate limits, this project currently depends on having the API documentation downloaded locally. To generate the JSON files locally, follow the excellent documentation over at [ember-jsonapi-docs](https://github.com/ember-learn/ember-jsonapi-docs#running-the-app).

Once the json files have been generated using ember-jsonapi-docs, reindexing algolia is easy.

1. `cp .env.example .env` - Copy the example environment configuration
2. Update the Algolia .env variables and path to the root of the generated API docs
3. `yarn` - Install dependencies
4. `yarn start` - Build the project using webpack and run the index script

## .env variables

1. `ALGOLIA_APP_ID` - The Algolia application ID, found in "API Keys" section of the Algolia dashboard
2. `ALGOLIA_ADMIN_KEY` - The Algolia admin key, found in "API Keys" section of the Algolia dashboard
3. `API_DOCS_PATH` - The path to the root of the built documentation from [ember-jsonapi-docs](https://github.com/ember-learn/ember-jsonapi-docs#running-the-app)
4. `DEBUG` - Outputs helpful debug information
5. `DRIVER` - Controls the type of the script's output. Available options: `algolia`, `json`. `json` can be helpful for debugging the output of the script without wasting any indexing operations on `algolia`.
