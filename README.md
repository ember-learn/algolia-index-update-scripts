# Algolia API docs indexing script

## Getting started

### Setup

1. `cp .env.example .env` - Copy the example environment configuration
2. Update the Algolia .env variables and path to the root of the generated API docs (only needed for populating indexes. use the `-j` flag to write to disk during development)
3. `yarn install` - Install dependencies

### Indexing API

Use any valid AWS tokens to setup the `AWS_ACCESS_KEY` & `AWS_SECRET_KEY` to download the json api docs.

Once generated, use the following command to re-index algolia:
`yarn start -p api`

### Indexing Guides

Guides json files are currently not stored somewhere, because they are built on demand using [broccoli-static-site-json](https://github.com/stonecircle/broccoli-static-site-json) in [guides-app](https://github.com/ember-learn/guides-app).
To Generate the JSON files locally, clone [guides-app](https://github.com/ember-learn/guides-app), and run `ember build`.

Once generated, use the following command to re-index algolia:
`yarn start -p guides`

## .env variables

1. `GUIDES_DOCS_PATH` - The path to the root of the built documentation from [guides-app](https://github.com/ember-learn/guides-app)
2. `ALGOLIA_APP_ID` - The Algolia application ID, found in "API Keys" section of the Algolia dashboard
3. `ALGOLIA_ADMIN_KEY` - The Algolia admin key, found in "API Keys" section of the Algolia dashboard
4. `AWS_ACCESS_KEY` & `AWS_SECRET_KEY` - Any valid AWS token that can be used to read our public json docs
