/**
 * 
 */

// imports

import React from "react"
import ExplorerCanvas from "../components/ExplorerCanvas"
import Header from "../components/Header"
import TetracoordDisplay from "../components/TetracoordDisplay"

import * as strings from "../public/strings.json"

import { Tetracoordinate } from "../src/tetracoords"

function HomePage() {
    let [cursor_tcoord, set_cursor_tcoord] = React.useState(new Tetracoordinate(Tetracoordinate.ZERO))

    return (
        <> 
            <div className="container text-center">
                <Header title={strings.title}/>

                <TetracoordDisplay tcoord={cursor_tcoord} />
                <ExplorerCanvas set_cursor_tcoord={set_cursor_tcoord} />
            </div>
        </>
    )
}

export default HomePage
