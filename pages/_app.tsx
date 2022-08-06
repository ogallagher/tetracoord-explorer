/**
 * 
 */

// imports

import 'bootstrap/dist/css/bootstrap.css'
import '../public/style.css'

import { useEffect } from 'react'

// components

export default function TetracoordExplorerApp({ Component, pageProps }) {
    // useEffect(() => {
    //     templogger.config({
    //         level: 'debug',
    //         name: 'tetracoord-webpage-driver',
    //         with_lineno: true,
    //         parse_level_prefix: true,
    //         with_level: true,
    //         with_cli_colors: false,
    //         log_to_file: false
    //     })
    //     .then(() => {
    //         console.log('debug initialized logging')
    //     })
    // }, [])

    return <Component {...pageProps} />
}
