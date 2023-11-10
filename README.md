# Algolia API docs indexing script

1. `cp .env.example .env` - Copy the example environment configuration
2. Update the Algolia .env variables (these credentials are in the Ember CLI 1Password)
3. `npm install` - Install dependencies
4. Ensure you have [ember-api-docs-data](https://github.com/ember-learn/ember-api-docs-data) cloned in a location on your machine alongside this project as a sibling and pull the latest changes
5. Use the following command to re-index Algolia: `npm start`

## .env variables

1. `ALGOLIA_APP_ID` - The Algolia application ID, found in "API Keys" section of the Algolia dashboard
2. `ALGOLIA_ADMIN_KEY` - The Algolia admin key, found in "API Keys" section of the Algolia dashboard
