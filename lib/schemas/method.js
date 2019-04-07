/**
 * Takes a "method" object and transforms it to the payload that needs to be stored in algolia
 * @param   {Object} method     - An object with the method information.
 * @returns {Object}            - Transformed object
 */
export default function methodSchema(method, versioned) {
  let versionId = versioned.data.relationships['project-version'].data.id;
  let version = versionId.substring(versionId.lastIndexOf('-')+1);

  return {
    file: method.file,
    line: method.line,

    module: method.module,
    class: method.class,
    name: method.name,

    static: method.static,
    access: method.access,

    _tags: [
      `module:${method.module}`,
      `version:${version}`
    ],

    hierarchy: {
      lvl0: method.module,
      lvl1: method.class,
      lvl2: method.name
    }
  }
}
