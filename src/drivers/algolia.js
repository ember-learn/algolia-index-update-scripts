import algoliasearch from 'algoliasearch';
import logger from 'src/utils/logger';

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env;
let client = null;

const indices = {};

export function init(indexName) {
    if(!client) client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    indices[indexName] = client.initIndex(indexName);
}

export function write(indexName, records) {
    const index = indices[indexName];

    index.addObjects(records, function(err, content) {
        if(err) {
            logger.logRed(`ALGOLIA:: Error adding ${records.length} records to ${indexName}`, err);
        }

        logger.logGreen(`ALGOLIA:: Successfully added ${records.length} records to ${indexName}`);
    })
}