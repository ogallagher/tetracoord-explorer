/**
 * Tetracoordinate space.
 */

// imports

import {
    Orientation
} from './misc'
import { 
    Quads,
    Tetracoordinate
} from './tetracoordinate'
import Vector2D, { CartesianCoordinate, RotationDirection, TRIG_PI_OVER_6 } from './vector2d'

// constants

const TCOORD_CELL_ANCHOR_OFFSET: Vector2D = new Vector2D(0, 0.25)

// ts types interfaces

// classes

export class TetracoordCell {
    tcoord: Tetracoordinate
    ccoord: Vector2D
    points: Array<Vector2D>
    anchor: Vector2D
    flip: boolean
    space: TetracoordSpace

    constructor(tcoord: Tetracoordinate, space: TetracoordSpace) {
        let rd = space.rotation_direction

        this.tcoord = tcoord
        this.ccoord = Vector2D.fromObject(tcoord.to_cartesian_coord(space.orientation))
        this.flip = TetracoordCell.tcoord_cell_flip(tcoord)
        
        this.anchor = TCOORD_CELL_ANCHOR_OFFSET.clone().multiplyScalar(rd)
        
        this.points = [
            new Vector2D(0, rd),
            new Vector2D(Math.cos(TRIG_PI_OVER_6*7*rd), Math.sin(TRIG_PI_OVER_6*7*rd)),
            new Vector2D(Math.cos(TRIG_PI_OVER_6*11*rd), Math.sin(TRIG_PI_OVER_6*11*rd))
        ]

        if (!this.flip) {
            this.anchor.multiplyScalar(-1)
            this.points = this.points.map((vector) => {
                return vector.multiplyScalarY(-1)
            })
        }

        this.space = space
    }

    /**
     * @returns Centroid of the equilateral cell triangle, corresponding to the true cartesian coordinate
     * (raw ccoord is center of bounding box in some graphics libs, like paperjs).
     */
    get_centroid(): Vector2D {
        return this.ccoord.clone().add(this.anchor)
    }

    get_bounds_center(): Vector2D {
        return this.ccoord.clone()
    }

    get_bounds_center_transformed(): Vector2D {
        return this.ccoord.clone().multiplyScalar(this.space.scale).add(this.space.origin)
    }

    /**
     * @returns Set of points scaled according to parent tspace scale.
     */
    get_points_scaled(): Array<Vector2D> {
        return this.points.map((vector) => {
            return (
                vector.clone()
                .add(this.anchor)
                .multiplyScalar(this.space.scale)
            )
        })
    }

    /**
     * // TODO rotate according to orientation.
     * 
     * @returns Set of points transformed according to the tcell position and parent tspace.
     */
    get_points_transformed(): Array<Vector2D> {
        return this.points.map((vector) => {
            return (
                vector.clone()
                .add(this.anchor)
                .multiplyScalar(this.space.scale)
                .add(this.space.origin)
            )
        })
    }

    /**
     * 
     * @param tcoord 
     * @returns 
     */
    static tcoord_cell_flip(tcoord: Tetracoordinate|Quads): boolean {
        let qs: Array<number>
        if (tcoord instanceof Tetracoordinate) {
            // tcoord is tcoord
            qs = tcoord.get_quad_strs().map((qs) => Number.parseInt(qs))
        }
        else if (typeof tcoord == 'string' || tcoord instanceof String) {
            // tcoord is string
            qs = tcoord.split('').map((qs) => Number.parseInt(qs))
        }
        else {
            // tcoord is number[]
            qs = tcoord
        }

        let flip = true
        for (let q of qs) {
            if (q != 0) {
                flip = !flip
            }
        }

        return flip
    }
}

/**
 * Tetracoordinate space for tracking tetracoord points relative to an equivalent cartesian space.
 */
 export class TetracoordSpace {
    /**
     * Tetracoord space orientation/rotation relative to a cartesian space centered at 0 = (0,0).
     */
    orientation: Orientation
    /**
     * Tetracoord space scale relative to cartesian space (magnitude of unit vector).
     */
    scale: number
    /**
     * Tetracoord space origin relative to cartesian space (offset from display origin).
     */
    origin: Vector2D
    /**
     * Direction of rotation, relative to the Y AXIS of the cartesian space (counter is toward positive y,
     * clock is toward negative y).
     */
    rotation_direction: RotationDirection

    /**
     * @param orientation {Orientation} Initial orientation.
     */
    constructor(
        orientation?: Orientation, 
        scale?: number, 
        origin?: Vector2D|CartesianCoordinate,
        rotation_direction?: RotationDirection
    ) {
        orientation === undefined ? orientation = Orientation.DEFAULT : orientation
        scale === undefined ? 1 : scale
        rotation_direction === undefined ? RotationDirection.DEFAULT : rotation_direction

        this.orientation = orientation
        this.scale = scale
        this.rotation_direction = rotation_direction
        if (origin instanceof Vector2D) {
            this.origin = origin
        }
        else {
            this.origin = Vector2D.fromObject(origin)
        }
    }

    /**
     * String representation of this tetracoord space instance.
     */
    toStringOverride(): string {
        return `tetracoord space instance`
    }
    /**
     * 
     * @param tcoord 
     * @returns 
     */
    tcoord_to_cell(tcoord: Tetracoordinate): TetracoordCell {
        return new TetracoordCell(tcoord, this)
    }

    /**
     * 
     * @param ccoord 
     * @returns 
     */
    ccoord_to_cell(ccoord: CartesianCoordinate): TetracoordCell {
        let vector = Vector2D.fromObject(ccoord)
        // .add(TCOORD_CELL_ANCHOR_OFFSET.clone().multiplyScalar(this.rotation_direction))
        .subtract(this.origin)
        .divideScalar(this.scale)

        let tcoord = Tetracoordinate.from_cartesian_coord(vector)

        return this.tcoord_to_cell(tcoord)
    }

    /**
     * // TODO handle orientation
     * @param tcoord 
     * @returns Transformed cartesian centroid.
     */
    tcoord_to_centroid(tcoord: Tetracoordinate): Vector2D {
        let flip = TetracoordCell.tcoord_cell_flip(tcoord)

        return (
            Vector2D.fromObject(tcoord.to_cartesian_coord())
            .add(
                TCOORD_CELL_ANCHOR_OFFSET.clone()
                .multiplyScalarY(flip ? -this.rotation_direction : this.rotation_direction)
            )
            .multiplyScalar(this.scale)
            .add(this.origin)
        )
    }
}

// TetracoordSpace overrides

TetracoordSpace.prototype.toString = TetracoordSpace.prototype.toStringOverride

// exports

export default TetracoordSpace
