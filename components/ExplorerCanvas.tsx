/**
 * 
 */

import React, { useEffect, createRef } from "react"
import paperjs = require("paper")
import { 
    Orientation,
    Tetracoordinate, 
    TRIG_PI_OVER_6 
} from "../src/tetracoords"
import {
    TetracoordSpace,
    TetracoordCell
} from "../src/tetracoords"
import Vector2D, { RotationDirection } from "../src/tetracoords/vector2d"

const UNIT_PX = 30
const RADIUS_PX = UNIT_PX * 0.5

function ExplorerCanvas() {
    const canvas_ref: React.RefObject<HTMLCanvasElement> = createRef()

    useEffect(() => {
        const paper = new paperjs.PaperScope()
        paper.setup(canvas_ref.current)
        paper.activate()
        console.log(paper.view)

        const tspace = new TetracoordSpace(
            Orientation.UP, 
            UNIT_PX,
            paper.view.bounds.center,
            RotationDirection.COUNTER
        )
        const unit_cell_dn = tspace.tcoord_to_cell(Tetracoordinate.ZERO)
        const unit_cell_up = tspace.tcoord_to_cell(Tetracoordinate.ONE)

        const sym_cell_dn_path = new paperjs.Path(
            unit_cell_dn.get_points_scaled()
            .map((point: Vector2D) => {
                return new paperjs.Point(point)
            })
        )
        sym_cell_dn_path.closePath()
        sym_cell_dn_path.strokeColor = new paperjs.Color('blue')
        console.log(unit_cell_dn)
        console.log(sym_cell_dn_path)

        const sym_cell_up_path = new paperjs.Path(
            unit_cell_up.get_points_scaled()
            .map((point: Vector2D) => {
                return new paperjs.Point(point)
            })
        )
        sym_cell_up_path.closePath()
        sym_cell_up_path.strokeColor = new paperjs.Color('blue')
        
        let sym_cell_dn = new paper.SymbolDefinition(sym_cell_dn_path)
        let sym_cell_up = new paper.SymbolDefinition(sym_cell_up_path)
        
        let tspace_levels = 4
        for (let i=0; i<Math.pow(4, tspace_levels); i++) {
            let qs = i.toString(4)
            let tc = new Tetracoordinate(qs)

            if (TetracoordCell.tcoord_cell_flip(qs)) {
                sym_cell_up.place(new paperjs.Point(tspace.tcoord_to_centroid(tc)))
            }
            else {
                sym_cell_dn.place(new paperjs.Point(tspace.tcoord_to_centroid(tc)))
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
                    new paperjs.Point(-0.5*RADIUS_PX,0),
                    new paperjs.Point(0.5*RADIUS_PX,0)
                ),
                new paperjs.Path.Line(
                    new paperjs.Point(0,-0.5*RADIUS_PX),
                    new paperjs.Point(0,0.5*RADIUS_PX)
                )
            ]
        })
        cursor.strokeWidth = 2
        cursor.strokeColor = new paperjs.Color('red')
        cursor.position.set(paper.view.center)

        // interaction
        
        paper.view.onMouseMove = function(mouse: paper.MouseEvent) {
            cursor.position.set(mouse.point.x, mouse.point.y)

            let tcell = tspace.ccoord_to_cell(mouse.point)
            console.log(`c=${tcell.ccoord.toString()} t=${tcell.tcoord.toString()}`)

            let pos = new paper.Point(
                tcell.get_bounds_center_transformed()
            )
            // let pos = new paper.Point(tcoord.to_cartesian_coord()).multiply(UNIT_PX).add(paper.view.bounds.center)
            cursor_cell.position.set(pos)
        }

        paper.view.onMouseUp = function(mouse: paper.MouseEvent) {
            
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
