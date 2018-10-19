require('dotenv').config()

import { all, resolve } from 'bluebird'
import { compare as compareSemVers } from 'semver'
import { difference } from 'lodash'

import logger from './utils/logger'
import drivers from './drivers'
import { readTmpFileFactory, readTmpFileAsyncFactory } from './utils/fs'
import schemas from './schemas'
import downloadApiDocs from './api-docs-sync'

// Get 'readTmpFile' and 'readTmpFileAsync' bound by 'api'
const PROJECT_TYPE = 'api'
const readTmpFile = readTmpFileFactory(PROJECT_TYPE)
const readTmpFileAsync = readTmpFileAsyncFactory(PROJECT_TYPE)

const { DRIVER } = process.env

const SelectedDriver = drivers[DRIVER]

const apiIndexes = ['modules', 'classes', 'methods', 'versions']

export async function run(clearIndex = false) {
  apiIndexes.map(SelectedDriver.init)

  if (clearIndex) {
    await all(apiIndexes.map(SelectedDriver.clear))
  }

  await downloadApiDocs()

  await all([processDocs('ember'), processDocs('ember-data')])
}

async function processDocs(project) {
  let prevIndexedVersions = await SelectedDriver.getPreviouslyIndexedVersions(
    project
  )

  const {
    meta: { availableVersions }
  } = await readTmpFileAsync(`rev-index/${project}.json`)

  let versionsToProcess = difference(availableVersions, prevIndexedVersions)

  if (versionsToProcess.length === 0) {
    console.log(`No new versions to process for ${project}`)
    return
  }

  try {
    console.log(`Processing ${project} for versions: ${versionsToProcess}`)

    await versionsToProcess
      .map(version => readIndexFileForVersion(version, project))
      // Fetch all public modules and public classes
      .map(versionIndexObject =>
        fetchPublicModuleClassesForVersion(versionIndexObject, project)
      )
      // Run the schema against all data stored
      .map(mapDataForVersion)
      // Write out to selected driver.
      .map(writeToDriver)

    await SelectedDriver.write(
      'versions',
      [
        {
          id: project,
          name: project,
          versions: [...prevIndexedVersions, ...versionsToProcess].sort(
            compareSemVers
          )
        }
      ],
      project
    )
  } catch (err) {
    console.log('Error:: ', err)
  }
}

/**
 * Read index file for version
 *
 * @param {string}          version     - Version of library to index
 * @param {string}          libName     - Name of library currently indexing
 * @returns {Promise}       - Returns found index file json
 */
function readIndexFileForVersion(version, libName) {
  const emberVersionJSONPath = `rev-index/${libName}-${version}.json`
  logger.logBlue(`OPENING:: ${emberVersionJSONPath}`)
  return readTmpFile(emberVersionJSONPath)
}

/**
 * Fetch public modules and classes for version
 *
 * @param {object} versionIndexObject        - The index.json file for a given version
 * @param {string} libName                  - The name of the library to index
 * @returns {object}                        - Extended version object with public modules & classes
 */
function fetchPublicModuleClassesForVersion(versionIndexObject, libName) {
  const publicModules = versionIndexObject.data.relationships[
    'public-modules'
  ].data.map(module => {
    // Module names are uri encoded
    const id = encodeURIComponent(module.id)
    const modulePath = `json-docs/${libName}/${
      versionIndexObject.data.attributes.version
    }/modules/${versionIndexObject.meta.module[id]}.json`

    logger.logBlue(`OPENING:: ${modulePath}`)
    return readTmpFile(modulePath)
  })

  const publicClasses = versionIndexObject.data.relationships[
    'public-classes'
  ].data.map(classObj => {
    // Class names are uri encoded
    const id = encodeURIComponent(classObj.id)
    const classPath = `json-docs/${libName}/${
      versionIndexObject.data.attributes.version
    }/classes/${versionIndexObject.meta.class[id]}.json`

    logger.logBlue(`OPENING:: ${classPath}`)
    return readTmpFile(classPath)
  })

  return {
    version: versionIndexObject,
    publicModules,
    publicClasses
  }
}

/**
 * Map the data for version
 *
 * @param {object} versionObject    - The version object to map
 * @returns {object}                - Extended version object with methods & mapped schemas
 */
function mapDataForVersion(versionObject) {
  const staticFunctions = extractStaticFunctionsFromModules(
    versionObject.publicModules
  )
  const methods = extractMethodsFromClasses(versionObject.publicClasses)

  return {
    ...versionObject,
    methods: [...methods, ...staticFunctions],
    publicModules: versionObject.publicModules.map(schemas.moduleSchema),
    publicClasses: versionObject.publicClasses.map(schemas.classSchema)
  }
}

/**
 * Writes out to the given driver
 *
 * @param versionObject         - Object version to write out
 */
function writeToDriver(versionObject) {
  const { id } = versionObject.version.data

  let tokens = id.split('-')
  let version = tokens.pop()
  let projectName = tokens.join('-')

  logger.logGreen(
    `version: ${id}, public classes: ${
      versionObject.publicClasses.length
    }, public modules: ${versionObject.publicModules.length}, methods: ${
      versionObject.methods.length
    }`
  )

  return all([
    SelectedDriver.write(
      'modules',
      versionObject.publicModules,
      projectName,
      version
    ),
    SelectedDriver.write(
      'classes',
      versionObject.publicClasses,
      projectName,
      version
    ),
    SelectedDriver.write('methods', versionObject.methods, projectName, version)
  ])
}

/**
 * Takes an array of classes, extracts the methods from each one,
 * and runs the method schema to transform the payload
 * @param {Array}   classes     - Array of "method" objects.
 * @return {Array}              - Returns an array of transformed method objects
 */
function extractMethodsFromClasses(classes) {
  return classes.reduce((methods, currentClass) => {
    return (
      currentClass.data.attributes.methods
        .reduce((classMethods, currentMethod) => {
          // Transform the current method and push on to methods.
          classMethods.push(schemas.methodSchema(currentMethod))
          return classMethods
        }, [])
        // Merge all methods of all classes into a single array
        .concat(methods)
    )
  }, [])
}

function extractStaticFunctionsFromModules(modules) {
  return modules.reduce((methods, currentModule) => {
    const staticfunctionsObj = currentModule.data.attributes.staticfunctions

    // Guard against staticfunctions not existing.
    if (!staticfunctionsObj) return methods
    // Extract all the static functions from inside their sub-modules
    const moduleStaticFunctions = Object.keys(staticfunctionsObj).reduce(
      (prevStaticFunctions, currModuleName) => {
        return prevStaticFunctions.concat(staticfunctionsObj[currModuleName])
      },
      []
    )

    return moduleStaticFunctions
      .reduce((moduleStaticFunctions, currentStaticFunction) => {
        moduleStaticFunctions.push(schemas.methodSchema(currentStaticFunction))
        return moduleStaticFunctions
      }, [])
      .concat(methods)
  }, [])
}
