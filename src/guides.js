require('dotenv').config();

import Bluebird from 'bluebird';
import logger from 'src/utils/logger';

import drivers from 'src/drivers';
import { readTmpFileAsyncFactory, readTmpFileFactory} from 'src/utils/fs';

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
        .then(emberJson => emberJson.data.attributes['all-versions'])
        .map()
        .tap(console.log);
}
