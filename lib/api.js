import 'dotenv/config'

import fsExtra from 'fs-extra'
import { difference } from 'lodash-es'
import { gt, compare as compareSemVers } from 'semver'

import algoliaDriver from './drivers/algolia.js'
import jsonDriver from './drivers/json.js'
import schemas from './schemas/index.js'

const { readJsonSync } = fsExtra;

const apiIndexes = ['modules', 'classes', 'methods', 'versions']

export async function runApi(clearIndex = false, useJsonDriver = false) {
  let driver = useJsonDriver ? jsonDriver : algoliaDriver

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
  } = readJsonSync(`../ember-api-docs-data/rev-index/${project}.json`)

  let versionsToProcess = difference(availableVersions, prevIndexedVersions)

  if (versionsToProcess.length === 0) {
    console.log(`No new versions to process for ${project}`)
    return
  }

  try {
    // iterate versions and drop latest minor of each major in buckets
    // make an array of the latest minors you get
    let latestPatches = Object.values(versionsToProcess.reduce(addIfLatestPatch, {}));
    console.log(`Processing ${project} for versions: ${latestPatches}`)
    await latestPatches
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
      [{ 
        id: project, 
        name: project,
        index_date_timestamp: Date.now(), 
        versions 
      }],
      project
    )
  } catch (err) {
    console.log('Error:: ', err)
  }
}

function addIfLatestPatch(latestPatches, version) {
  let semvers = version.split('.')
  let major = semvers[0];
  let minor = semvers[1];
  let minorVersion = `${major}.${minor}`;
  if (minorVersion in latestPatches && gt(version, latestPatches[minorVersion])) {
    latestPatches[minorVersion] = version;
  } else if (!(minorVersion in latestPatches)) {
    latestPatches[minorVersion] = version;
  }
  return latestPatches;
}

function filterMissingRevs(version, libName) {
  const emberVersionJSONPath = `../ember-api-docs-data/rev-index/${libName}-${version}.json`
  let isIncluded = true
  try {
    readJsonSync(emberVersionJSONPath)
  } catch(e) {
    isIncluded = false
  }
  return isIncluded
}

function readIndexFileForVersion(version, libName) {
  const emberVersionJSONPath = `../ember-api-docs-data/rev-index/${libName}-${version}.json`
  console.debug(`OPENING:: ${emberVersionJSONPath}`)
  return readJsonSync(emberVersionJSONPath)
}

function fetchPublicModuleClassesForVersion(versionIndexObject, libName) {
  const publicModules = versionIndexObject.data.relationships[
    'public-modules'
  ].data.map(module => {
    const id = module.id;
    if(!versionIndexObject.meta.module[id]){
      console.warn(`Skipping processing module ${id} because it's missing a meta entry`);
      return null;
    }
    const modulePath = `../ember-api-docs-data/json-docs/${libName}/${
      versionIndexObject.data.attributes.version
    }/modules/${versionIndexObject.meta.module[id]}.json`

    console.debug(`OPENING:: ${modulePath}`)
    return readJsonSync(modulePath)
  }).filter(Boolean)

  const publicClasses = versionIndexObject.data.relationships[
    'public-classes'
  ].data.map(classObj => {
    const id = classObj.id;
    const classPath = `../ember-api-docs-data/json-docs/${libName}/${
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
