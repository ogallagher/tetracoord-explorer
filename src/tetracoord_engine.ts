/**
 * Tetracoordinates engine.
 */

// imports

// constants

// types

enum Orientation {
    UP = 'up',
    DOWN = 'dn',
    LEFT = 'lf',
    RIGHT = 'rt',
    CUSTOM = '',

    DEFAULT = UP
}

enum TetracoordQuadOrder {
    HIGH_FIRST = 'h',
    LOW_FIRST = 'l',

    DEFAULT = HIGH_FIRST
}

// typescript types, interfaces

interface CartesianCoordinate {
    x: number,
    y: number
}

// classes

/**
 * Tetracoordinate point.
 */
export class Tetracoordinate {
    static LEVELS_PER_BYTE: number = 4
    static DEFAULT_MAX_LEVELS: number = Tetracoordinate.LEVELS_PER_BYTE * 1

    /**
     * Raw binary representation of this tcoord. Each tcoord digit/place value is represented with 2 bits.
     * Each byte represents up to 4 tcoord digits (8/2=4).
     */
    bytes: Uint8Array
    /**
     * How many places to move the tcoord decimal point to the right.
     * In quaternary notation, tcoord = buffer * 4^power.
     */
    power: number
    quad_order: TetracoordQuadOrder

    constructor(
        value: Tetracoordinate|Uint8Array|Array<number>|string=undefined, 
        power: number=undefined, 
        quad_order: TetracoordQuadOrder=undefined
    ) {
        this.quad_order = quad_order === undefined ? TetracoordQuadOrder.DEFAULT : quad_order

        this.bytes = new Uint8Array(Tetracoordinate.LEVELS_PER_BYTE / Tetracoordinate.DEFAULT_MAX_LEVELS)

        if (value === undefined) {
            console.log('debug create tcoord 0')
            this.power = 0
        }
        else if (typeof value === 'string' || value instanceof String) {
            console.log('debug create tcoord from quaternary str')
            this.power = power

            let d_arr: Array<number> = []
            for (let i=0; i<value.length; i++) {
                const c: string = value[i]
                if (c === '.' && this.power === undefined) {
                    this.power = value.length-1 - i
                }
                else {
                    d_arr.push(Number.parseInt(c))
                }
            }

            this.set_levels(d_arr)
        }
        else if (value instanceof Tetracoordinate) {
            console.log(`debug clone tcoord ${value}`)
            this.bytes = new Uint8Array(value.bytes)
            this.power = power === undefined ? value.power : power
        }
        else if (Array.isArray(value)) {
            console.log('debug create tcoord from int array')
            this.power = power
            this.set_levels(value)
        }
        else {
            console.log('debug create tcoord from bytes')
            this.power = power
            this.bytes = value
        }

        if (this.power === undefined) {
            this.power = 0
        }
    }

    /**
     * TODO test quad orders
     * TODO test digits types
     * 
     * @param digits Int array where each element is a single digit. First digit is hightest place value.
     * @param level_order
     */
    set_levels(digits: Array<number>|string|number, level_order: TetracoordQuadOrder=undefined) {
        if (typeof digits === 'number' || digits instanceof Number) {
            digits = digits.toString()
        }
        if (typeof digits === 'string' || digits instanceof String) {
            let digits_arr: Array<number> = digits.split('').map((d_char) => {
                return Number.parseInt(d_char)
            })
            digits = digits_arr
        }

        // increase byte length as needed
        const level_n = digits.length
        if (level_n > (this.bytes.byteLength * Tetracoordinate.LEVELS_PER_BYTE)) {
            this.bytes = new Uint8Array(Math.ceil(level_n / Tetracoordinate.LEVELS_PER_BYTE))
        }
        else {
            this.bytes.fill(0)
        }

        if (level_order === undefined) {
            level_order = this.quad_order
        }

        const self = this
        function quad_idx_ordered(qi: number): number {
            return level_order === TetracoordQuadOrder.LOW_FIRST 
                ? qi 
                : Tetracoordinate.LEVELS_PER_BYTE-1 - qi
        }
        function byte_idx_ordered(bi: number): number {
            return level_order === TetracoordQuadOrder.HIGH_FIRST
                ? bi
                : self.bytes.byteLength-1 - bi
        }

        let byte: number = 0
        let byte_idx: number = 0
        let quad_idx: number = 0
        const BITS_PER_LEVEL = 2
        for (let i=0; i<level_n; i++) {
            let qi = quad_idx_ordered(quad_idx)
            let bi = byte_idx_ordered(byte_idx)

            // bit shift to current level quad (bit pair) in byte
            let d = digits[i] << qi * 2

            // bitwise or to set quad within byte
            byte |= d

            console.log(
                `debug Bi=${bi} qi=${qi} Bb=${byte.toString(2)} Bq=${byte.toString(4)}`
            )

            // update offsets
            quad_idx++
            if (quad_idx >= Tetracoordinate.LEVELS_PER_BYTE) {
                // write byte to bytes
                this.bytes.set([byte], bi)

                byte_idx++
                quad_idx = 0
                byte = 0
            }
        }
        if (byte_idx < this.bytes.byteLength) {
            // write last byte to bytes
            this.bytes.set([byte], byte_idx_ordered(byte_idx))
        }
    }

    /**
     * String representation of this tetracoord instance.
     */
    toStringOverride(): string {
        let byte_strs_q = new Array(this.bytes.byteLength)
        for (let i=0; i<this.bytes.byteLength; i++) {
            byte_strs_q[i] = this.bytes.at(i).toString(4)
        }
        return `tcoord(bytes=${byte_strs_q.join('-')}q power=${this.power})`
    }
}

// Tetracoordinate overrides
Tetracoordinate.prototype.toString = Tetracoordinate.prototype.toStringOverride

/**
 * Tetracoordinate space for tracking tetracoord points relative to an equivalent cartesian space.
 */
export class TetracoordinateSpace {
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

// TetracoordinateSpace overrides

TetracoordinateSpace.prototype.toString = TetracoordinateSpace.prototype.toStringOverride

/**
 * 
 */
export default class TetracoordinateEngine {
    tspace: TetracoordinateSpace

    constructor(orientation: Orientation=undefined) {
        this.tspace = new TetracoordinateSpace(orientation)
    }

    /**
     * String representation of this tetracoord engine instance.
     */
    toStringOverride(): string {
        return `tengine(\n  tspace=${this.tspace}\n)`
    }
}

// TetracoordinateEngine overrides

TetracoordinateEngine.prototype.toString = TetracoordinateEngine.prototype.toStringOverride

