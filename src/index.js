require('dotenv').config();

import Bluebird from 'bluebird';
import logger from 'src/utils/logger';
import drivers from 'src/drivers';
import { request } from 'src/utils/request';

const {
    DRIVER,
    DEBUG,
    FASTLY_ENDPOINT: fastlyEndpoint
} = process.env;

if(DEBUG) logger.logGreen(`Started downloading assets from:: ${fastlyEndpoint}`);

function randomPromiseTimer() {
    return new Bluebird.Promise(resolve => {
        setTimeout(resolve, Math.random() * 150);
    });
}
// Start downloading json files
request(`${fastlyEndpoint}/rev-index/ember.json`)
.then(emberJson => emberJson.meta.availableVersions)
// Grab the json file of each ember version
.map(version => {
    const emberVersionJson = `${fastlyEndpoint}/rev-index/ember-${version}.json`;

    logger.logBlue(`DOWNLOADING:: ${emberVersionJson}`);

    return request(emberVersionJson)
    .then(res => {
        if(DEBUG) {
            drivers.json.write(`rev-index/${res.data.attributes.version}/version.json`, res);
        }

        logger.logBlue(`COMPLETED:: ${emberVersionJson}`);
        return res;
    });
})
.map(version => {
    const publicModules = version.data.relationships['public-modules'].data
        .map(module => {
            // encode uri component of the public module, to grab the
            // module path on fastly from the "meta.module" object
            const id = encodeURIComponent(module.id);
            const modulePath = version.meta.module[id];
            return `${fastlyEndpoint}/json-docs/ember/${version.data.attributes.version}/modules/${modulePath}.json`
        })
        // .map(randomPromiseTimer)
        .map(request);

    const publicClasses = version.data.relationships['public-classes'].data
        .map(classObj => {
            // encode uri component of the public class, to grab the
            // class path on fastly from the "meta.class" object
            const id = encodeURIComponent(classObj.id);
            const classPath = version.meta.class[id];

            return `${fastlyEndpoint}/json-docs/ember/${version.data.attributes.version}/classes/${classPath}.json`
        })
        // .then(randomPromiseTimer)
        .map(request);

    return Bluebird.props({
        version,
        publicModules: Bluebird.all(publicModules),
        publicClasses: Bluebird.all(publicClasses)
    });
})
// Remove modules and classes which requests have failed for
.map(versionObject => {
    return {
        ...versionObject,
        publicModules: versionObject.publicModules.filter(m => m && m.attributes && m.attributes.name),
        publicClasses: versionObject.publicClasses.filter(c => c && c.attributes && c.attributes.name)
    };
})
// Write out to json & algolia
.map(versionObject => {
    console.log('fulfilled bluebird props');
    console.log(`map ${versionObject.version.id}`);
    if(DEBUG) {
        versionObject.publicModules
            .forEach(publicModule => {
                drivers.json.write(`rev-index/${versionObject.version.data.attributes.version}/public_modules/${encodeURIComponent(publicModule.attributes.name)}.json`, publicModule);
            });
        versionObject.publicClasses
            .forEach(publicClass => {
                drivers.json.write(`rev-index/${versionObject.version.data.attributes.version}/public_classes/${encodeURIComponent(publicClass.attributes.name)}.json`, publicClass);
            })
    }
    // console.log('version', version.data.id);
})
.catch(err => {
    console.log('Error on global script::', err);
});