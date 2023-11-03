import AlgoliaSearch from 'algoliasearch';

import 'dotenv/config'

let client = null;
let index = null;

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env

function init(indexName) {
  if (!client) client = AlgoliaSearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

  return client.initIndex(indexName);
}

const params = {
  "facets": [
    "version",
   ],
  "facetFilters": [
    [
     "_tags:version:5.4.0"
    ]
  ],
};

index = init('methods');

// index.search('', params).then((results) => {
//   const {hits} = results;
//   console.log(hits.length, results);
// }).catch(console.log);


index.deleteBy('', params).then((results) => {
  const {hits} = results;
  console.log(hits, results);
}).catch(console.log);