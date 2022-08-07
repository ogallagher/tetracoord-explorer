/**
 * 
 */

import React from "react"
import paperjs from "paper"
import { 
    Orientation,
    Tetracoordinate,
    Vector2D,
    TetracoordSpace,
    TetracoordCell
} from "../src/tetracoords"

interface ExplorerCanvasProps {
    flip_y: boolean
    set_cursor_tcoord: React.Dispatch<Tetracoordinate>
}

const UNIT_PX = 30
const RADIUS_PX = UNIT_PX * 0.5

function ExplorerCanvas(props: ExplorerCanvasProps) {
    const canvas_ref: React.RefObject<HTMLCanvasElement> = React.createRef()

    React.useEffect(() => {
        const paper = new paperjs.PaperScope()
        paper.setup(canvas_ref.current)
        paper.activate()
        console.log(paper.view)

        const tspace = new TetracoordSpace(
            Orientation.UP,
            UNIT_PX,
            paper.view.bounds.center
        )
        const flip_y = props.flip_y

        let unit_cell_dn_path = new paperjs.Path(
            tspace.tcoord_to_cell(Tetracoordinate.ZERO)
            .get_points_scaled_oriented()
            .map((point: Vector2D) => {
                return new paperjs.Point(point)
            })
        )
        unit_cell_dn_path.closePath()
        unit_cell_dn_path.visible = false

        let unit_cell_up_path = new paperjs.Path(
            tspace.tcoord_to_cell(Tetracoordinate.ONE)
            .get_points_scaled_oriented()
            .map((point: Vector2D) => {
                return new paperjs.Point(point)
            })
        )
        unit_cell_up_path.closePath()
        unit_cell_up_path.visible = false

        if (flip_y) {
            let temp = unit_cell_up_path
            unit_cell_up_path = unit_cell_dn_path
            unit_cell_dn_path = temp
        }
        
        let tspace_levels = 4
        for (let i=0; i<Math.pow(4, tspace_levels); i++) {
            let qs = i.toString(4)
            let tc = new Tetracoordinate(qs)

            let flip = TetracoordCell.tcoord_cell_flip(qs)
            let cell: paper.Path = (
                flip ? unit_cell_up_path.clone() : unit_cell_dn_path.clone()
            )
            cell.position = new paperjs.Point(tspace.tcoord_to_centroid(tc))
            if (flip_y) {
                cell.position.y = paper.view.bounds.height - cell.position.y
            }
            cell.visible = true
            cell.strokeWidth = 1
            cell.strokeColor = new paperjs.Color('white')

            let level = qs.length
            cell.fillColor = new paperjs.Color(
                (level % 3) / 2, 
                ((3*level+1) % 4) / 3, 
                ((2*level+2) % 5) / 4, 
                0.25
            )
        }

        let cursor_cell = new paperjs.Path.Circle(
            paper.view.center,
            RADIUS_PX
        )
        cursor_cell.closePath()
        cursor_cell.strokeWidth = 0
        cursor_cell.fillColor = new paperjs.Color('white')

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
        }

        paper.view.onMouseUp = function(mouse: paper.MouseEvent) {
            let m = mouse.point
            if (flip_y) {
                m.y = paper.view.bounds.height - m.y
            }
            let tcell = tspace.ccoord_to_cell(m)

            props.set_cursor_tcoord(tcell.tcoord)

            let pos = new paper.Point(
                tcell.get_bounds_center_transformed()
            )
            if (flip_y) {
                pos.y = paper.view.bounds.height - pos.y
            }
            cursor_cell.position.set(pos)
        }
    }, [])
    
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
