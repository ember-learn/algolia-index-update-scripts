import { resolve } from 'bluebird'
import {
  emptyDirSync,
  existsSync,
  outputJsonSync,
  readJsonSync,
  rmdirSync,
} from 'fs-extra'

const outputFolder = './drivers-output'

function init() {}

function write(indexName, content, projectName, version) {
  let fileName = `${outputFolder}/json/${projectName}/`
  fileName += version ? `${version}/${indexName}.json` : `${indexName}.json`

  return outputJsonSync(fileName, content, { spaces: 2 })
}

function clear() {
  if (!existsSync(outputFolder)) {
    return resolve()
  }
  emptyDirSync(outputFolder)
  return resolve(rmdirSync(outputFolder))
}

function getPreviouslyIndexedVersions(projectName) {
  let fileName = `${outputFolder}/json/${projectName}/versions.json`

  if (!existsSync(fileName)) {
    return []
  }

  let [{ versions }] = readJsonSync(fileName)
  return versions
}

export default { init, write, clear, getPreviouslyIndexedVersions }
