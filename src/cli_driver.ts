/**
 * Tetracoord engine cli driver.
 */

/**
 * temp_js_logger is not currently written as a module, so it requires use of the import method instead.
 */
let templogger
import TetracoordinateEngine from './tetracoord_engine'

function init(modules: Array<any>): Promise<any> {
    templogger = modules[0]

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

Promise.all([
    import('temp_js_logger')
])
.then(init)
.then(main)
