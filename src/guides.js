require('dotenv').config();
// Dependencies
import Bluebird from 'bluebird';
import logger from 'src/utils/logger';

// Lib
import drivers from 'src/drivers';
import { readTmpFileAsyncFactory, readTmpFileFactory} from 'src/utils/fs';
import schemas from 'src/schemas';

// Get 'readTmpFile' and 'readTmpFileAsync' bound by 'api'
const PROJECT_TYPE = 'guides';
const readTmpFile = readTmpFileFactory(PROJECT_TYPE);
const readTmpFileAsync = readTmpFileAsyncFactory(PROJECT_TYPE);

const { DRIVER } = process.env;

const SelectedDriver = drivers[DRIVER];

export function run() {
    // Initialise the driver
    SelectedDriver.init('guides');

    return readTmpFileAsync('versions.json')
        // Extract available guides versions
        .then(emberJson => emberJson.data.attributes['all-versions'])
        // Clear the driver contents
        .tap(clearDriver)
        .map(getPagesForVersion)
        .map(populateSubPagesForVersion)
        .map(flattenPagesAndMapSchema)
        .map(writeToDriver)
        .tap(console.log);
}

/**
 * Writes out to the given driver
 *
 * @param versionObject         - Object version to write out
 */
function writeToDriver({ version, pages }) {
    // logger.logGreen(`version: ${versionObject.version.data.id}, public classes: ${versionObject.publicClasses.length}, public modules: ${versionObject.publicModules.length}, methods: ${versionObject.methods.length}`);

    // Wait for all promises to complete before continuing
    return Bluebird.all([
        SelectedDriver.write('guides', pages)
    ]);
}

/**
 * Clears the driver indices
 *
 * @returns {Promise}       - Promise with all drivers cleared.
 */
function clearDriver() {
    SelectedDriver.clear('guides');
}

function getPagesForVersion(version) {
    const pages = readTmpFile(`${version}/pages.json`).data;

    return {
        version,
        pages
    };
}

function populateSubPagesForVersion({ version, pages }) {
    const populatedPages = pages
        .reduce((prev, currentPage) => {
            //  Return previous result if there are no subpages
            if(currentPage.type !== 'pages' || !currentPage.attributes.pages)  return prev;
            // Populate the pages with the contents of the json file
            // Flatten attributes to simplify object
            const newPage = {
                ...currentPage,
                ...currentPage.attributes,
                pages: populateSubPages(version, currentPage.attributes.pages)
            };

            // Remove attributes.pages to simplify page object
            // delete currentPage.attributes;
            delete newPage.attributes;

            prev.push(newPage);

            return prev;
        }, []);

    return {
        version,
        pages: populatedPages
    };
}

function populateSubPages(version, subPages) {
    return subPages
        .map(currentPage => {
            // Some url attributes include a trailing "/". Make sure that's removed before attempting to load the file
            const url = currentPage.url.replace(new RegExp('/$'), '');
            // Load page and merge with existing currentPage properties
            const pageJson = readTmpFile(`${version}/${url}.json`).data;
            return { ...currentPage, ...pageJson };
        });
}

function flattenPagesAndMapSchema({ version, pages }) {
    const flattenedPages = pages
        .reduce((prev, currentPage) => {
            console.log('currentPage', currentPage);
            // Extract the sub-pages of this page and pass them through the schema
            const flattenedSubPages = currentPage.pages
                .map(currentSubPage => {
                    return schemas.guideItemSchema(version, { title: currentPage.title }, currentSubPage);
                });

            // Merge previous flattened sub-pages with new flattened sub pages
            return prev.concat(flattenedSubPages);
        }, []);

    return { version, pages: flattenedPages };
}