require('dotenv').config();

import Bluebird from 'bluebird';
import logger from 'src/utils/logger';
import drivers from 'src/drivers';
import { readTmpFileFactory, readTmpFileAsyncFactory } from 'src/utils/fs';
import schemas from './schemas';

// Get 'readTmpFile' and 'readTmpFileAsync' bound by 'api'
const PROJECT_TYPE = 'api';
const readTmpFile = readTmpFileFactory(PROJECT_TYPE);
const readTmpFileAsync = readTmpFileAsyncFactory(PROJECT_TYPE);

const { DRIVER } = process.env;

const SelectedDriver = drivers[DRIVER];

export function run() {
    // Initialise drivers
    SelectedDriver.init('modules');
    SelectedDriver.init('classes');
    SelectedDriver.init('methods');

    // Load ember.json which includes all available ember versions.
    return readTmpFileAsync('rev-index/ember.json')
        // Extract available versions
        .then(emberJson => emberJson.meta.availableVersions)
        // Clear the driver contents
        .tap(clearDriver)
        // Grab the json file of each ember version
        .map(readEmberIndexFileForVersion)
        // Fetch all public modules and public classes
        .map(fetchPublicModuleClassesForEmberVersion)
        // Run the schema against all data stored
        .map(mapDataForVersion)
        // Write out to selected driver.
        .map(writeToDriver)
        // Load ember-data.json which includes all available ember-data versions
        .then(() => readTmpFileAsync('rev-index/ember-data.json'))
        .then(emberJson => emberJson.meta.availableVersions)
        .map(readEmberDataIndexFileForVersion)
        .map(fetchPublicModuleClassesForEmberDataVersion)
        .map(mapDataForVersion)
        .map(writeToDriver)
        // Handle script error
        .catch(errorHandler);

}

function readEmberIndexFileForVersion(version) {
  return readIndexFileForVersion(version, 'ember');
}

function readEmberDataIndexFileForVersion(version) {
  return readIndexFileForVersion(version, 'ember-data');
}
/**
 * Read index file for version
 *
 * @param {string}          version     - Version of library to index
 * @param {string}          libName     - Name of library currently indexing
 * @returns {Promise}       - Returns found index file json
 */
function readIndexFileForVersion(version, libName) {
    const emberVersionJSONPath = `rev-index/${libName}-${version}.json`;
    logger.logBlue(`OPENING:: ${emberVersionJSONPath}`);
    return readTmpFile(emberVersionJSONPath);
}

function fetchPublicModuleClassesForEmberVersion(versionIndexObject) {
  return fetchPublicModuleClassesForVersion(versionIndexObject, 'ember');
}

function fetchPublicModuleClassesForEmberDataVersion(versionIndexObject) {
  return fetchPublicModuleClassesForVersion(versionIndexObject, 'ember-data');
}

/**
 * Fetch public modules and classes for version
 *
 * @param {object} versionIndexObject        - The index.json file for a given version
 * @param {string} libName                  - The name of the library to index
 * @returns {object}                        - Extended version object with public modules & classes
 */
function fetchPublicModuleClassesForVersion(versionIndexObject, libName) {
    const publicModules = versionIndexObject.data.relationships['public-modules'].data
    .map(module => {
        // Module names are uri encoded
        const id = encodeURIComponent(module.id);
        const modulePath = `json-docs/${libName}/${versionIndexObject.data.attributes.version}/modules/${versionIndexObject.meta.module[id]}.json`;

        logger.logBlue(`OPENING:: ${modulePath}`);
        return readTmpFile(modulePath);
    });

    const publicClasses = versionIndexObject.data.relationships['public-classes'].data
    .map(classObj => {
        // Class names are uri encoded
        const id = encodeURIComponent(classObj.id);
        const classPath = `json-docs/${libName}/${versionIndexObject.data.attributes.version}/classes/${versionIndexObject.meta.class[id]}.json`;

        logger.logBlue(`OPENING:: ${classPath}`);
        return readTmpFile(classPath);
    });

    return {
        version: versionIndexObject,
        publicModules,
        publicClasses
    };
}

/**
 * Map the data for version
 *
 * @param {object} versionObject    - The version object to map
 * @returns {object}                - Extended version object with methods & mapped schemas
 */
function mapDataForVersion(versionObject) {
    const staticFunctions = extractStaticFunctionsFromModules(versionObject.publicModules);
    const methods = extractMethodsFromClasses(versionObject.publicClasses);

    return {
        ...versionObject,
        methods: [...methods, ...staticFunctions],
        publicModules: versionObject.publicModules.map(schemas.moduleSchema),
        publicClasses: versionObject.publicClasses.map(schemas.classSchema)
    };
}

/**
 * Writes out to the given driver
 *
 * @param versionObject         - Object version to write out
 */
function writeToDriver(versionObject) {
    logger.logGreen(`version: ${versionObject.version.data.id}, public classes: ${versionObject.publicClasses.length}, public modules: ${versionObject.publicModules.length}, methods: ${versionObject.methods.length}`);

    // Wait for all promises to complete before continuing
    return Bluebird.all([
        SelectedDriver.write('modules', versionObject.publicModules),
        SelectedDriver.write('classes', versionObject.publicClasses),
        SelectedDriver.write('methods', versionObject.methods)
    ]);
}

/**
 * Clears the driver indices
 *
 * @returns {Promise}       - Promise with all drivers cleared.
 */
function clearDriver() {
    return Bluebird.all([
        SelectedDriver.clear('modules'),
        SelectedDriver.clear('classes'),
        SelectedDriver.clear('methods')
    ]);
}

// Handle errors
function errorHandler(err) {
    console.log('Error:: ', err);
}

/**
 * Takes an array of classes, extracts the methods from each one,
 * and runs the method schema to transform the payload
 * @param {Array}   classes     - Array of "method" objects.
 * @return {Array}              - Returns an array of transformed method objects
 */
function extractMethodsFromClasses(classes) {
    return classes.reduce((methods, currentClass) => {
        return currentClass.data.attributes.methods
            .reduce((classMethods, currentMethod) => {
                // Transform the current method and push on to methods.
                classMethods.push(schemas.methodSchema(currentMethod));
                return classMethods;
            }, [])
            // Merge all methods of all classes into a single array
            .concat(methods);
    }, []);
}

function extractStaticFunctionsFromModules(modules) {
    return modules.reduce((methods, currentModule) => {
        const staticfunctionsObj = currentModule.data.attributes.staticfunctions;

        // Guard against staticfunctions not existing.
        if(!staticfunctionsObj) return methods;
        // Extract all the static functions from inside their sub-modules
        const moduleStaticFunctions = Object.keys(staticfunctionsObj)
            .reduce((prevStaticFunctions, currModuleName) => {
                return prevStaticFunctions.concat(staticfunctionsObj[currModuleName]);
            }, []);

        return moduleStaticFunctions
            .reduce((moduleStaticFunctions, currentStaticFunction) => {
                moduleStaticFunctions.push(schemas.methodSchema(currentStaticFunction));
                return moduleStaticFunctions;
            }, [])
            .concat(methods);
    }, []);
}
