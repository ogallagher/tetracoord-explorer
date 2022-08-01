/**
 * Tetracoord engine cli driver.
 */

import templogger = require('temp_js_logger')
import TetracoordinateEngine from './tetracoord_engine'

function init(): Promise<any> {
    return Promise.all([
        templogger.config({
            level: 'debug',
            name: 'tetracoord-cli-driver',
            with_lineno: true,
            parse_level_prefix: true,
            with_level: true,
            with_cli_colors: true,
            log_to_file: true
        })
        .then(() => {
            console.log('debug initialized logging')
        })
    ])
}

function main() {
    console.log('info init tetracoord engine')
    const tengine: TetracoordinateEngine = new TetracoordinateEngine()
    console.log(`info ${tengine}`)
}

init().then(main)
