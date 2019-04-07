/**
 * Takes a "class" object and transforms it to the payload that needs to be stored in algolia
 * @param   {Object} classObj - An object with the class information.
 * @returns {Object}          - Transformed object
 */
export default function classSchema(classObj) {
  const data = classObj.data
  const attributes = data.attributes
  const versionId = data.relationships['project-version'].data.id;
  const version = versionId.substring(versionId.lastIndexOf('-')+1);

  return {
    id: data.id,
    name: attributes.name,
    module: attributes.module,
    namespace: attributes.namespace,
    _tags: [
      `module:${attributes.module}`,
      `version:${version}`
    ]
  }
}
