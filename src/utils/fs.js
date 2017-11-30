require('dotenv').config();
import fs from 'fs';
import Bluebird from 'bluebird';

const { API_DOCS_PATH } = process.env;

/**
 * Opens a file and JSON.parses it synchronously.
 * The result will be the contents of the file.
 *
 * @param   {String}    fileName - Path to the file
 * @returns {Promise}
 */
export function readTmpFile(fileName) {
    const fileContents = fs.readFileSync(`${API_DOCS_PATH}/${fileName}`);

    return JSON.parse(fileContents);
}

/**
 * Opens a file and JSON.parses it asynchronously.
 * The result will be a promise with the contents as the resolved value.
 *
 * @param   {String}    fileName - Path to the file
 * @returns {Promise}
 */
export function readTmpFileAsync(fileName) {
    const readFileAsync = Bluebird.promisify(fs.readFile);
    const filePath = `${API_DOCS_PATH}/${fileName}`;

    return readFileAsync(filePath).then(JSON.parse);
}

export default {
    readTmpFile,
    readTmpFileAsync
};