require('dotenv').config()

import Bluebird from 'bluebird'
import AlgoliaSearch from 'algoliasearch'
import logger from '../utils/logger'

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY } = process.env
let client = null

const indices = {}

export function init(indexName) {
  if (!client) client = AlgoliaSearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)
  // Create an algolia index
  const index = client.initIndex(indexName)
  // Store index in list of indices to use later during save operations
  indices[indexName] = index

  return index
}

export function write(indexName, records) {
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

export function clear(indexName) {
  const index = indices[indexName]
  return Bluebird.resolve(index.clearIndex())
}

export default {
  init,
  write,
  clear
}
