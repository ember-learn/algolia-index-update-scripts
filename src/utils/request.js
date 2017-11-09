import rp from 'request-promise';
import { logBlue, logRed } from 'src/utils/logger';

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