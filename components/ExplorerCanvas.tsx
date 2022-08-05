/**
 * 
 */

import React, { useEffect, createRef } from "react"
import paperjs = require("paper")
import { 
    Tetracoordinate, 
    TRIG_PI_OVER_6 
} from "../src/tetracoords"

const UNIT_PX = 30
const RADIUS_PX = UNIT_PX * 0.5

function ExplorerCanvas() {
    const canvas_ref: React.RefObject<HTMLCanvasElement> = createRef()

    useEffect(() => {
        const paper = new paperjs.PaperScope()
        paper.setup(canvas_ref.current)
        paper.activate()
        console.log(paper.view)

        let grid_cell_up_path = new paperjs.Path([
            new paperjs.Point(0, -UNIT_PX),
            new paperjs.Point(Math.cos(-TRIG_PI_OVER_6*7)*UNIT_PX, Math.sin(-TRIG_PI_OVER_6*7)*UNIT_PX),
            new paperjs.Point(Math.cos(-TRIG_PI_OVER_6*11)*UNIT_PX, Math.sin(-TRIG_PI_OVER_6*11)*UNIT_PX)
        ])
        let grid_cell_up = new paper.SymbolDefinition(grid_cell_up_path)
        grid_cell_up_path.closePath()
        grid_cell_up_path.strokeColor = new paperjs.Color('blue')

        let grid_cell_dn = new paper.SymbolDefinition(grid_cell_up.item.clone())
        grid_cell_dn.item.rotate(180, new paperjs.Point(0, 0.25))
        
        for (let i=0; i<Math.pow(4, 4); i++) {
            let qs = i.toString(4)
            let flip = (Math.floor(Math.log(i)/Math.log(4)) % 2 == 0) ? (i % 4 == 0) : (i % 4 != 0)
            let tc = new Tetracoordinate(qs)
            if (flip) {
                grid_cell_up.place(
                    new paperjs.Point(tc.to_cartesian_coord())
                    .add(new paperjs.Point(0, -0.25))
                    .multiply(UNIT_PX)
                    .add(paper.view.bounds.center)
                )
            }
            else {
                grid_cell_dn.place(
                    new paperjs.Point(tc.to_cartesian_coord())
                    .add(new paperjs.Point(0, 0.25))
                    .multiply(UNIT_PX)
                    .add(paper.view.bounds.center)
                )
            }
        }

        let cursor_cell = new paperjs.Path.Circle(
            paper.view.center,
            RADIUS_PX
        )
        cursor_cell.closePath()
        cursor_cell.strokeColor = new paperjs.Color('transparent')
        cursor_cell.fillColor = new paperjs.Color('green')

        let cursor = new paperjs.CompoundPath({
            children: [
                new paperjs.Path.Line(
                    new paperjs.Point(-0.5*UNIT_PX,0),
                    new paperjs.Point(0.5*UNIT_PX,0)
                ),
                new paperjs.Path.Line(
                    new paperjs.Point(0,-0.5*UNIT_PX),
                    new paperjs.Point(0,0.5*UNIT_PX)
                )
            ]
        })
        cursor.strokeWidth = 2
        cursor.strokeColor = new paperjs.Color('red')
        cursor.position.set(paper.view.center)

        // interaction
        
        paper.view.onMouseMove = function(mouse: paper.MouseEvent) {
            cursor.position.set(mouse.point.x, mouse.point.y)
        }

        paper.view.onMouseUp = function(mouse: paper.MouseEvent) {
            let ccoord = mouse.point.subtract(paper.view.bounds.center).divide(UNIT_PX)
            let tcoord = Tetracoordinate.from_cartesian_coord(ccoord)
            console.log(`c=${ccoord.toString()} t=${tcoord.toString()}`)

            let pos = new paper.Point(tcoord.to_cartesian_coord()).multiply(UNIT_PX).add(paper.view.bounds.center)
            cursor_cell.position.set(pos)
        }
    }, [ canvas_ref ])
    
    return (
        <div className="canvas-parent">
            <canvas 
                className="explorer-canvas"
                ref={canvas_ref}
                // resize canvas and paperscope viewport
                data-paper-resize="true">
            </canvas>
        </div>
    )
}

export default ExplorerCanvas
