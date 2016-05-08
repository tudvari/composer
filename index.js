'use strict';

const async = require('async');
let fragments = [];

/**
 * @function processProp
 * @param prop {String} - property name
 * @param serviceProperties {Object} - list with serviceProperties
 * @param ymlFragment {String} - reference for the YML fragment to write to
 * @return {String} - composed yml structure for the prop
 */
function processSingleProp(prop, serviceProperties, version) {
    prop = prop.trim();
    var ymlFragment = '';
    if (serviceProperties[prop] == undefined) return "";
    // Check if it is an array
    if (Array.isArray(serviceProperties[prop])) {
        // Array entry -> iterate and build props
        if (serviceProperties[prop].length > 0) {
            ymlFragment = ymlFragment.concat("  ").concat(prop + ':\n');
            for (let propVal of serviceProperties[prop]) {
                ymlFragment = ymlFragment.concat("   - ").concat(propVal).concat('\n');
            }
            ;
        }
        ;
    } else {
        if (typeof serviceProperties[prop] === "object" && !Array.isArray(serviceProperties[prop])) {
            let objectKey = serviceProperties[prop];
            if (Object.getOwnPropertyNames(objectKey).length) {
                // Object entry -> iterate and build props
                ymlFragment = ymlFragment.concat("  ").concat(prop + ':\n');
                for (let envJSONKey of Object.getOwnPropertyNames(objectKey)) {
                    let objValue = objectKey[envJSONKey];
                    if (version === 2) {
                        ymlFragment = ymlFragment.concat("    ").concat(envJSONKey).concat(": ").concat(objValue).concat('\n');
                    } else {
                        ymlFragment = ymlFragment.concat("   - ").concat(envJSONKey).concat(":").concat(objValue).concat('\n');
                    }
                }
            }
            ;
        } else {
            // It's not an array
            ymlFragment = ymlFragment.concat("  " + prop + ": ").concat(serviceProperties[prop]).concat('\n');
        }
        ;
    }
    ;
    // return the fragment
    return ymlFragment;
};

function processProps(serviceName, serviceProperties, cb, version) {
    // Instantiate the ymlFragment
    let ymlFragment = '';
    // Check the existance of the service name
    if (!serviceName) {
        let error = new Error('missing servicename..');
        return cb(error);
    }
    // Check the existance of serviceProperties
    if (!serviceProperties) {
        let error = new Error('missing properties..');
        return cb(error);
    }

    // Concat the service name
    fragments.push(ymlFragment.concat(serviceName).concat(':').concat('\n'));

    // Iterate throughout all the JSON file and build the requested services in the YML file
    for (let prop of Object.getOwnPropertyNames(serviceProperties)) {
        fragments.push(processSingleProp(prop, serviceProperties, version));
    }
    ;
};

/**
 * @exports
 */
module.exports.generate = function (json, callback, version) {

    if (json && (json.version === 2 || version === 2)) {
        version = version || json.version;
        fragments = [
            "version: '2' \n",
            "services: \n"
        ];
    } else {
        fragments = [];
    }


    //input validations
    if (!json) {
        return callback(new Error('json is missing'));
    }

    let parsedJSON = '';

    try {
        parsedJSON = JSON.parse(json);
    } catch (err) {
        // Send back the error
        return callback(err);
    }

    // JSON processing

    async.forEachOf(parsedJSON, function (value, key, callback) {
        processProps(key, value, callback, version);
    });

    let resultString = '';

    if (version === 2) {
        for (let i = 0; i < fragments.length; i++) {
            let fragment = fragments[i];
            if (i > 1) {
                resultString = resultString + " ";
                resultString = resultString.concat(fragment);
            }
        }
    } else {
        for (let fragment of fragments) {
            resultString = resultString.concat(fragment);
        }
    }

    // Return the callback with the resulted string
    return callback(null, resultString);
}
