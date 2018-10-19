require('dotenv').config()

import Bluebird from 'bluebird'
import AlgoliaSearch from 'algoliasearch'
import logger from '../utils/logger'

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

function write(indexName, records) {
  const index = indices[indexName]

  return Bluebird.resolve(index.addObjects(records))
    .tap(() => {
      logger.logGreen(
        `ALGOLIA:: Successfully added ${records.length} records to ${indexName}`
      )
    })
    .catch(err => {
      return logger.logRed(
        `ALGOLIA:: Error adding ${records.length} records to ${indexName}`,
        err
      )
    })
}

function clear(indexName) {
  const index = indices[indexName]
  return Bluebird.resolve(index.clearIndex())
}

async function getPreviouslyIndexedVersions(projectName) {
  let { hits } = await indices['versions'].search(projectName)
  if (!hits) {
    return []
  }
  let { versions } = hits.find(hit => hit.name === projectName)
  return versions
}

export default { init, write, clear, getPreviouslyIndexedVersions }
