/**
 * 
 */

import React from "react"
import paperjs = require("paper")

function ExplorerCanvas() {
    const canvas = (
        <canvas 
            className="explorer-canvas"
            id="owen"
            width="400" height="400">
        </canvas>
    )

    // TODO wait for dom to be ready to setup paperscope
    setTimeout(() => {
        const paper = new paperjs.PaperScope()
        paper.setup('owen')
        paper.activate()
        console.log(paper.view)

        let rect = new paperjs.Path([
            new paperjs.Segment({x: 0, y: 0}),
            new paperjs.Segment({x: 20, y: 0}),
            new paperjs.Segment({x: 10, y: 20})
        ])
        rect.closePath()
        rect.strokeWidth = 2
        rect.strokeColor = new paperjs.Color('red')
        rect.fillColor = new paperjs.Color(1, 1, 1)

        paper.view.onMouseMove = function(mouse: paper.MouseEvent) {
            rect.position.set(mouse.point.x, mouse.point.y)
        }
    }, 1000)
    

    return canvas
}

export default ExplorerCanvas
