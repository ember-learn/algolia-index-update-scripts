# Algolia API docs indexing script

## Getting started

### Setup

1. `cp .env.example .env` - Copy the example environment configuration
2. Update the Algolia .env variables and path to the root of the generated API docs (only needed for populating indexes. use the `-j` flag to write to disk during development)
3. `yarn install` - Install dependencies

### Indexing API

Use any valid AWS tokens to setup the `AWS_ACCESS_KEY` & `AWS_SECRET_KEY` to download the json api docs.

Use the following command to re-index algolia:
`yarn start`

## .env variables

1. `ALGOLIA_APP_ID` - The Algolia application ID, found in "API Keys" section of the Algolia dashboard
2. `ALGOLIA_ADMIN_KEY` - The Algolia admin key, found in "API Keys" section of the Algolia dashboard
3. `AWS_ACCESS_KEY` & `AWS_SECRET_KEY` - Any valid AWS token that can be used to read our public json docs
