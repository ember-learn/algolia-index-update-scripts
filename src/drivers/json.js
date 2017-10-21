import fs from 'file-system';

export function init(fileName) {}

export function write(fileName, content) {
    return fs.writeFileSync(`./drivers-output/json/${fileName}`, JSON.stringify(content), 'utf8');
}

export default {
    init,
    write
};