require('dotenv').config()

import { readJson, readJsonSync } from 'fs-extra'
import { difference } from 'lodash-es'
import algoliaDriver from './drivers/algolia'
import jsonDriver from './drivers/json'
import schemas from './schemas'

const { GUIDES_DOCS_PATH } = process.env

function getVersions() {
  return readJson(`${GUIDES_DOCS_PATH}/versions.json`)
}

const guidesIndexes = ['guides', 'versions']

export async function run(clearIndex = false, useJsonDriver = false) {
  let driver = useJsonDriver ? jsonDriver : algoliaDriver

  guidesIndexes.map(driver.init)

  if (clearIndex) {
    driver.clear('guides')
  }

  let emberJson = await getVersions()
  let availableVersions = emberJson.data.attributes['all-versions']

  let prevIndexedVersions = await driver.getPreviouslyIndexedVersions('guides')

  let versionsToProcess = difference(availableVersions, prevIndexedVersions)

  if (versionsToProcess.length === 0) {
    return console.log('Guides indexes are up to date')
  }

  await versionsToProcess
    .map(getPagesForVersion)
    .map(populateSubPagesForVersion)
    .map(flattenPagesAndMapSchema)
    .map(({ pages }) => driver.write('guides', pages))

  let versions = [...availableVersions, ...prevIndexedVersions]

  await driver.write(
    'versions',
    [{ id: 'guides', name: 'guides', versions }],
    'guides'
  )
  console.log(`Processing guides for ${versionsToProcess}`)
}

function getPagesForVersion(version) {
  const pages = readJsonSync(`${GUIDES_DOCS_PATH}/${version}/pages.json`).data
  return { version, pages }
}

function populateSubPagesForVersion({ version, pages }) {
  const populatedPages = pages.reduce((prev, currentPage) => {
    //  Return previous result if there are no subpages
    if (currentPage.type !== 'pages' || !currentPage.attributes.pages)
      return prev
    // Populate the pages with the contents of the json file
    // Flatten attributes to simplify object
    const newPage = {
      ...currentPage,
      ...currentPage.attributes,
      pages: populateSubPages(version, currentPage.attributes.pages),
    }

    // Remove attributes.pages to simplify page object
    // delete currentPage.attributes;
    delete newPage.attributes

    prev.push(newPage)

    return prev
  }, [])

  return {
    version,
    pages: populatedPages,
  }
}

function populateSubPages(version, subPages) {
  return subPages.map(currentPage => {
    // Some url attributes include a trailing "/". Make sure that's removed before attempting to load the file
    const url = currentPage.url.replace(new RegExp('/$'), '')
    // Load page and merge with existing currentPage properties
    const pageJson = readJsonSync(`${GUIDES_DOCS_PATH}/${version}/${url}.json`)
      .data
    return { ...currentPage, ...pageJson }
  })
}

function flattenPagesAndMapSchema({ version, pages }) {
  const flattenedPages = pages.reduce((prev, currentPage) => {
    console.log('currentPage', currentPage)
    // Extract the sub-pages of this page and pass them through the schema
    const flattenedSubPages = currentPage.pages.map(currentSubPage => {
      return schemas.guideItemSchema(
        version,
        { title: currentPage.title },
        currentSubPage
      )
    })

    // Merge previous flattened sub-pages with new flattened sub pages
    return prev.concat(flattenedSubPages)
  }, [])

  return { version, pages: flattenedPages }
}
