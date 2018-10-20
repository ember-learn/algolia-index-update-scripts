import {
  emptyDirSync,
  existsSync,
  outputJsonSync,
  readJsonSync,
  rmdirSync,
} from 'fs-extra'

const { resolve } = Promise

const outputFolder = './drivers-output'

function init(indexName) {}

function write(indexName, content, projectName, version) {
  let fileName = `${outputFolder}/json/${projectName}/`

  if (version) {
    fileName += `${version}/${indexName}.json`
  } else {
    fileName += `${indexName}.json`
  }

  return outputJsonSync(fileName, content, { spaces: 2 })
}

function clear(indexName) {
  if (!existsSync(outputFolder)) {
    return resolve()
  }
  emptyDirSync(outputFolder)
  return rmdirSync(outputFolder)
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
