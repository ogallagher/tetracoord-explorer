/**
 * Tetracoord engine cli driver.
 */

import pino from "pino"
import TetracoordEngine from "./tetracoord/tetracoord_engine"

const logger = pino({
  name: 'tcoord-cli',
  level: 'debug'
})

function main() {
  logger.info('init tetracoord engine')
  const tengine: TetracoordEngine = new TetracoordEngine()
  logger.info(tengine)
}

main()
