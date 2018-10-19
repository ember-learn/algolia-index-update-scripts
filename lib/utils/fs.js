require('dotenv').config()
import fs from 'fs'
import Bluebird from 'bluebird'

const { GUIDES_DOCS_PATH } = process.env

/**
 * Returns the correct root path to the content of the project requested
 *
 * @param projectType   - Type of project we're indexing. "api" or "guides"
 * @returns {string}    - Path to the project
 */
export function getProjectFolderPath(projectType) {
  const isCorrectType = ['guides', 'api'].includes(projectType)
  const folderPaths = { guides: GUIDES_DOCS_PATH, api: './tmp' }

  if (!isCorrectType) throw new Error('Incorrect projectType')

  return folderPaths[projectType]
}

/**
 * Opens a file and JSON.parses it synchronously.
 * The result will be the contents of the file.
 *
 * @param   {String}    fileName           - Path to the file
 * @param   {String}    projectType        - Type of project we're indexing. "api" or "guides"
 * @returns {Promise}
 */
export function readTmpFile(projectType, fileName) {
  const folderPath = getProjectFolderPath(projectType)
  const fileContents = fs.readFileSync(`${folderPath}/${fileName}`)

  return JSON.parse(fileContents)
}

/**
 * Opens a file and JSON.parses it asynchronously.
 * The result will be a promise with the contents as the resolved value.
 *
 * @param   {String}    fileName           - Path to the file
 * @param   {String}    projectType        - Type of project we're indexing. "api" or "guides"
 * @returns {Promise}
 */
export function readTmpFileAsync(projectType, fileName) {
  const readFileAsync = Bluebird.promisify(fs.readFile)
  const folderPath = getProjectFolderPath(projectType)
  const filePath = `${folderPath}/${fileName}`

  return readFileAsync(filePath).then(JSON.parse)
}

export function readTmpFileFactory(projectType) {
  return function(fileName) {
    return readTmpFile(projectType, fileName)
  }
}

export function readTmpFileAsyncFactory(projectType) {
  return function(fileName) {
    return readTmpFileAsync(projectType, fileName)
  }
}

export default {
  readTmpFile,
  readTmpFileAsync,

  readTmpFileFactory,
  readTmpFileAsyncFactory
}
