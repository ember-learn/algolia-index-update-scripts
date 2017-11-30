require('dotenv').config();

import logger from 'src/utils/logger';
import drivers from 'src/drivers';
import { readTmpFile, readTmpFileAsync } from 'src/utils/fs';
import schemas from './schemas';

const {
    DRIVER,
    DEBUG
} = process.env;

// Initialise driver
drivers[DRIVER].init('modules');
drivers[DRIVER].init('classes');
drivers[DRIVER].init('methods');

// Load ember.json which includes all available ember versions.
readTmpFileAsync('rev-index/ember.json')
// Extract available versions
.then(emberJson => emberJson.meta.availableVersions)
// Grab the json file of each ember version
.map(version => {
    const emberVersionJSONPath = `rev-index/ember-${version}.json`;
    logger.logBlue(`OPENING:: ${emberVersionJSONPath}`);
    return readTmpFile(emberVersionJSONPath);
})
// Fetch all public modules and public classes
.map(version => {
    const publicModules = version.data.relationships['public-modules'].data
        .map(module => {
            // Module names are uri encoded
            const id = encodeURIComponent(module.id);
            const modulePath = `json-docs/ember/${version.data.attributes.version}/modules/${version.meta.module[id]}.json`;

            logger.logBlue(`OPENING:: ${modulePath}`);
            return readTmpFile(modulePath);
        });

    const publicClasses = version.data.relationships['public-classes'].data
        .map(classObj => {
            // Class names are uri encoded
            const id = encodeURIComponent(classObj.id);
            const classPath = `json-docs/ember/${version.data.attributes.version}/classes/${version.meta.class[id]}.json`;

            logger.logBlue(`OPENING:: ${classPath}`);
            return readTmpFile(classPath);
        });

    return {
        version,
        publicModules,
        publicClasses
    };
})
// Run the schema against all data stored
.map(versionObject => {
    return {
        ...versionObject,

        methods: extractMethodsFromClasses(versionObject.publicClasses),
        publicModules: versionObject.publicModules.map(schemas.moduleSchema),
        publicClasses: versionObject.publicClasses.map(schemas.classSchema)
    };
})
// Write out to selected driver.
.map(versionObject => {
    logger.logGreen(`version: ${versionObject.version.data.id}, public classes: ${versionObject.publicClasses.length}, public modules: ${versionObject.publicModules.length}, methods: ${versionObject.methods.length}`);

    drivers[DRIVER].write('modules', versionObject.publicModules);
    drivers[DRIVER].write('classes', versionObject.publicClasses);
    drivers[DRIVER].write('methods', versionObject.methods);
})
.catch(err => {
    console.log('Error::', err);
});

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