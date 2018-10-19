import Bluebird from 'bluebird'
import fs from 'file-system'

export function init(fileName) {}

export function write(fileName, content) {
  return fs.writeFileSync(
    `./drivers-output/json/${fileName}.json`,
    JSON.stringify(content),
    'utf8'
  )
}

export function clear() {
  return Bluebird.resolve()
}

export default { init, write, clear }
