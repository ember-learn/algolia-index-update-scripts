require('dotenv').config()

import { readJsonSync } from 'fs-extra'
import { difference } from 'lodash-es'
import { compare as compareSemVers } from 'semver'
import downloadApiDocs from './api-docs-sync'
import algoliaDriver from './drivers/algolia'
import jsonDriver from './drivers/json'
import schemas from './schemas'

const apiIndexes = ['modules', 'classes', 'methods', 'versions']

export async function runApi(clearIndex = false, useJsonDriver = false) {
  let driver = useJsonDriver ? jsonDriver : algoliaDriver

  await downloadApiDocs()

  apiIndexes.map(driver.init)

  if (clearIndex) {
    apiIndexes.map(driver.clear)
  }

  await Promise.all([
    processDocs(driver, 'ember'),
    processDocs(driver, 'ember-data'),
  ])
}

async function processDocs(driver, project) {
  let prevIndexedVersions = await driver.getPreviouslyIndexedVersions(project)

  const {
    meta: { availableVersions },
  } = readJsonSync(`./tmp/rev-index/${project}.json`)

  let versionsToProcess = difference(availableVersions, prevIndexedVersions)

  if (versionsToProcess.length === 0) {
    console.log(`No new versions to process for ${project}`)
    return
  }

  try {
    console.log(`Processing ${project} for versions: ${versionsToProcess}`)

    await versionsToProcess
      .filter(version => filterMissingRevs(version, project))
      .map(version => readIndexFileForVersion(version, project))
      // Fetch all public modules and public classes
      .map(versionIndexObject =>
        fetchPublicModuleClassesForVersion(versionIndexObject, project)
      )
      // Run the schema against all data stored
      .map(mapDataForVersion)
      .map(content => writeToDriver(driver, content))

    let versions = [...prevIndexedVersions, ...versionsToProcess].sort(
      compareSemVers
    )

    await driver.write(
      'versions',
      [{ id: project, name: project, versions }],
      project
    )
  } catch (err) {
    console.log('Error:: ', err)
  }
}

function filterMissingRevs(version, libName) {
  const emberVersionJSONPath = `./tmp/rev-index/${libName}-${version}.json`
  let isIncluded = true
  try {
    readJsonSync(emberVersionJSONPath)
  } catch(e) {
    isIncluded = false
  }
  return isIncluded
}

function readIndexFileForVersion(version, libName) {
  const emberVersionJSONPath = `./tmp/rev-index/${libName}-${version}.json`
  console.debug(`OPENING:: ${emberVersionJSONPath}`)
  return readJsonSync(emberVersionJSONPath)
}

function fetchPublicModuleClassesForVersion(versionIndexObject, libName) {
  const publicModules = versionIndexObject.data.relationships[
    'public-modules'
  ].data.map(module => {
    // Module names are uri encoded
    const id = encodeURIComponent(module.id)
    const modulePath = `./tmp/json-docs/${libName}/${
      versionIndexObject.data.attributes.version
    }/modules/${versionIndexObject.meta.module[id]}.json`

    console.debug(`OPENING:: ${modulePath}`)
    return readJsonSync(modulePath)
  })

  const publicClasses = versionIndexObject.data.relationships[
    'public-classes'
  ].data.map(classObj => {
    // Class names are uri encoded
    const id = encodeURIComponent(classObj.id)
    const classPath = `./tmp/json-docs/${libName}/${
      versionIndexObject.data.attributes.version
    }/classes/${versionIndexObject.meta.class[id]}.json`

    console.debug(`OPENING:: ${classPath}`)
    return readJsonSync(classPath)
  })

  return {
    version: versionIndexObject,
    publicModules,
    publicClasses,
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
    publicClasses: versionObject.publicClasses.map(schemas.classSchema),
  }
}

function writeToDriver(driver, versionObject) {
  const { id } = versionObject.version.data

  let tokens = id.split('-')
  let version = tokens.pop()
  let projectName = tokens.join('-')

  console.info(
    `version: ${id}, public classes: ${
      versionObject.publicClasses.length
    }, public modules: ${versionObject.publicModules.length}, methods: ${
      versionObject.methods.length
    }`
  )

  return Promise.all([
    driver.write('modules', versionObject.publicModules, projectName, version),
    driver.write('classes', versionObject.publicClasses, projectName, version),
    driver.write('methods', versionObject.methods, projectName, version),
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
          classMethods.push(schemas.methodSchema(currentMethod, currentClass))
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
        moduleStaticFunctions.push(schemas.methodSchema(currentStaticFunction, currentModule))
        return moduleStaticFunctions
      }, [])
      .concat(methods)
  }, [])
}
