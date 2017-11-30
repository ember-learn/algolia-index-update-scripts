import rp from 'request-promise';
import { logBlue, logRed } from 'src/utils/logger';

/**
 * Makes an HTTP request to the uri provided and returns a promise.
 *
 * @param {String} uri          - URL to make the request
 * @param {Object} overrides    - Object merged in with request configuration.
 * @returns {Promise}           - Result of the request
 */
export function request(uri, overrides = {}) {
    logBlue(`DOWNLOADING:: ${uri}`);

    return rp({
        uri,
        json: true,
        ...overrides
    })
    .then(res => {
        logBlue(`COMPLETED DOWNLOAD:: ${uri}`);
        return res;
    })
    .catch(err => {
        logRed(`FAILED DOWNLOAD:: (${err.statusCode}) ${uri}`);
        console.log('err', JSON.stringify(err));
        return {};
    });
}