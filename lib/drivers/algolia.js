require('dotenv').config()

import AlgoliaSearch from 'algoliasearch'

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env

let client = null

const indices = {}

function init(indexName) {
  if (!client) client = AlgoliaSearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)

  // Create an algolia index
  const index = client.initIndex(indexName)

  // Store index in list of indices to use later during save operations
  indices[indexName] = index

  return index
}

function write(indexName, records, projectName) {
  const index = indices[indexName]

  return index
    .addObjects(records)
    .then(() =>
      console.log(
        `ALGOLIA:: Successfully added ${records.length} records to ${indexName}`
      )
    )
    .catch(err =>
      console.error(
        `ALGOLIA:: Error adding ${records.length} records to ${indexName}`,
        err
      )
    )
}

function clear(indexName) {
  const index = indices[indexName]
  return index.clearIndex()
}

async function getPreviouslyIndexedVersions(projectName) {
  let hits

  try {
    ;({ hits } = await indices['versions'].search(projectName))
  } catch (err) {
    console.error(err)
  }

  if (!hits) {
    return []
  }

  let hit = hits.find(hit => hit.name === projectName)

  if (!hit) {
    return []
  }

  let { versions } = hit
  return versions
}

export default { init, write, clear, getPreviouslyIndexedVersions }
