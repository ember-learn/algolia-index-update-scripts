/**
 * Takes a "module" object and transforms it to the payload that needs to be stored in algolia
 * @param   {Object} module     - An object with the module information.
 * @returns {Object}            - Transformed object
 */
export default function moduleSchema(module) {
  const data = module.data;
  const attributes = data.attributes;
  let versionId = data.relationships['project-version'].data.id;
  let version = versionId.substring(versionId.lastIndexOf('-') + 1);
  return {
    id: data.id,
    name: attributes.name,
    submodules: attributes.submodules,
    namespaces: attributes.namespaces,
    _tags: [`module:${attributes.name}`, `version:${version}`],
  };
}
