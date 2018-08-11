/**
 * Takes a version, parent (lvl0) and a "guide item" object and transforms it to the payload that needs to be stored in algolia
 * @param   {Object} version    - Ember version string
 * @param   {Object} parent     - Parent object to be used for lvl0 hierarchy
 * @param   {Object} item       - The object to transform
 * @returns {Object}
 */
export default function guideItemSchema(version, parent, item) {
    // console.log('item', item);
    const skipTocTag = item['skip-toc']? `skipTOC:true` : `skipTOC:false`;

    return {
        title: item.title,
        id: item.id,
        url: item.url,
        content: item.attributes.content,
        description: item.attributes.description,

        _tags: [
            `version:${version}`,
            skipTocTag
        ],

        hierarchy: {
            lvl0: parent.title,
            lvl1: item.title
        }
    };
}