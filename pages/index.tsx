/**
 * 
 */

// imports

import React = require("react")
import ExplorerCanvas from "../components/ExplorerCanvas"
import Header from "../components/Header"

import strings = require("../public/strings.json")

function HomePage() {
    return (
        <> 
            <div className="container text-center">
                <Header title={strings.title}/>

                <ExplorerCanvas />
            </div>
        </>
    )
}

export default HomePage
