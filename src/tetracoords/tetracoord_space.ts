/**
 * Tetracoordinate space.
 */

// imports

import {
    Orientation
} from './misc'

// classes

/**
 * Tetracoordinate space for tracking tetracoord points relative to an equivalent cartesian space.
 */
 export class TetracoordSpace {
    /**
     * Tetracoord space orientation/rotation relative to a cartesian space centered at 0 = (0,0).
     */
    orientation: Orientation

    /**
     * @param orientation {Orientation} Initial orientation.
     */
    constructor(orientation: Orientation=undefined) {
        if (orientation === undefined) {
            orientation = Orientation.DEFAULT
        }

        this.orientation = orientation
    }

    /**
     * String representation of this tetracoord space instance.
     */
    toStringOverride(): string {
        return `tetracoord space instance`
    }
}

// TetracoordSpace overrides

TetracoordSpace.prototype.toString = TetracoordSpace.prototype.toStringOverride

// exports

export default TetracoordSpace
