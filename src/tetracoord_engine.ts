/**
 * Tetracoordinates engine.
 */

// imports

import Vector = require('victor')

// constants

const TRIG_PI = Math.PI
const TRIG_PI_OVER_2 = Math.PI / 2
const TRIG_SIN_PI_OVER_6 = 0.5
const TRIG_COS_PI_OVER_6 = Math.sqrt(3)/2
const TRIG_SIN_PI_OVER_3 = TRIG_COS_PI_OVER_6
const TRIG_COS_PI_OVER_3 = TRIG_SIN_PI_OVER_6

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

    static ZERO: Tetracoordinate = new Tetracoordinate('0', 0)
    static ONE: Tetracoordinate = new Tetracoordinate('1', 0)
    static TWO: Tetracoordinate = new Tetracoordinate('2', 0)
    static THREE: Tetracoordinate = new Tetracoordinate('3', 0)

    static unit_to_cartesian: Map<Tetracoordinate, CartesianCoordinate> = new Map()

    /**
     * Raw binary representation of this tcoord. Each tcoord digit/place value is represented with 2 bits.
     * Each byte represents up to 4 tcoord digits (8/2=4).
     */
    bytes: Uint8Array
    /**
     * Number of significant quad digits in this tcoord (can be less than num_bytes*4).
     */
    num_levels: number
    /**
     * How many places to move the tcoord decimal point.
     * In quaternary notation, tcoord = bytes * 4^power.
     */
    power: number
    /**
     * Order that the quaternary digits (bit pairs) are stored in the underlying byte array.
     */
    quad_order: TetracoordQuadOrder
    /**
     * Whether the least significant digit is infinitely repeating after the decimal.
     */
    irrational: boolean

    /**
     * 
     * @param value 
     * @param power Placed to move the decimal point.
     * @param quad_order Order that the quad digits will be stored in the byte array.
     * @param num_levels Number of significant quaternary digits. Only needed if providing a byte array
     * that could have leading/trailing insignificant zeros.
     */
    constructor(
        value: Tetracoordinate|Uint8Array|Array<number>|string=undefined, 
        power: number=undefined, 
        quad_order: TetracoordQuadOrder=undefined,
        num_levels: number=undefined,
        irrational: boolean=undefined
    ) {
        this.quad_order = quad_order === undefined ? TetracoordQuadOrder.DEFAULT : quad_order
        this.bytes = new Uint8Array(Tetracoordinate.LEVELS_PER_BYTE / Tetracoordinate.DEFAULT_MAX_LEVELS)
        this.irrational = irrational === undefined ? false : true

        if (value === undefined) {
            console.log('debug create tcoord 0')
            this.power = 0
            this.num_levels = 1
        }
        else if (typeof value === 'string' || value instanceof String) {
            console.log('debug create tcoord from quaternary str')
            this.power = power
            this.num_levels = value.length

            let d_arr: Array<number> = []
            for (let i=0; i<value.length; i++) {
                const c: string = value[i]
                if (c === '.' && this.power === undefined) {
                    this.power = (this.quad_order == TetracoordQuadOrder.HIGH_FIRST)
                        ? -(value.length-1 - i)
                        : -i
                }
                else {
                    d_arr.push(Number.parseInt(c))
                }
            }

            this.set_digits(d_arr)
        }
        else if (value instanceof Tetracoordinate) {
            console.log(`debug clone tcoord ${value}`)
            this.bytes = new Uint8Array(value.bytes)
            this.num_levels = value.num_levels
            this.power = power === undefined ? value.power : power
        }
        else if (Array.isArray(value)) {
            console.log('debug create tcoord from int array')
            this.power = power
            this.num_levels = value.length
            this.set_digits(value)
        }
        else {
            console.log('debug create tcoord from bytes')
            this.power = power
            this.num_levels = num_levels === undefined 
                ? value.byteLength * Tetracoordinate.LEVELS_PER_BYTE
                : num_levels
            this.bytes = value
        }

        if (this.power === undefined) {
            this.power = 0
        }
    }

    /**
     * @param digits Int array where each element is a single digit. First digit is hightest place value.
     * Note this does not support setting the power (decimal point).
     * @param level_order The level order that quaternary digits are listed (high first vs low first).
     * 
     * @returns {Tetracoordinate} this
     */
    set_digits(digits: Array<number>|string, level_order: TetracoordQuadOrder=undefined): Tetracoordinate {
        if (typeof digits === 'string' || digits instanceof String) {
            let digits_arr: Array<number> = digits.split('').map((d_char) => {
                return Number.parseInt(d_char)
            })
            digits = digits_arr
        }

        if (level_order === undefined) {
            level_order = this.quad_order
        }

        this.num_levels = digits.length

        // zero pad digits to fill bytes
        let rem = this.num_levels % Tetracoordinate.LEVELS_PER_BYTE
        if (rem > 0) {
            let zeros: Array<number> = new Array(Tetracoordinate.LEVELS_PER_BYTE - rem)
            zeros.fill(0)

            if (this.quad_order === TetracoordQuadOrder.HIGH_FIRST) {
                // leading zeros
                digits = zeros.concat(digits)
            }
            else {
                // trailing zeros
                digits = digits.concat(zeros)
            }
        }

        // increase byte length as needed
        if (this.num_levels > (this.bytes.byteLength * Tetracoordinate.LEVELS_PER_BYTE)) {
            this.bytes = new Uint8Array(Math.ceil(this.num_levels / Tetracoordinate.LEVELS_PER_BYTE))
        }
        else {
            this.bytes.fill(0)
        }

        const self = this
        function quad_idx_ordered(qi: number): number {
            return level_order === self.quad_order 
                ? Tetracoordinate.LEVELS_PER_BYTE-1 - qi
                : qi
        }
        function byte_idx_ordered(bi: number): number {
            return level_order === self.quad_order
                ? bi
                : self.bytes.byteLength-1 - bi
        }

        let byte: number = 0
        let byte_idx: number = 0
        let quad_idx: number = 0
        const BITS_PER_LEVEL = 2
        for (let i=0; i<digits.length; i++) {
            let qi = quad_idx_ordered(quad_idx)
            let bi = byte_idx_ordered(byte_idx)

            // bit shift to current level quad (bit pair) in byte
            let d = digits[i] << qi * 2

            // bitwise or to set quad within byte
            byte |= d

            // console.log(
            //     `debug Bi=${bi} qi=${qi} Bb=${byte.toString(2)} Bq=${byte.toString(4)}`
            // )

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

        return this
    }

    /**
     * Get equivalent cartesian point.
     * TODO handle orientation!=DEFAULT
     * 
     * @param {Orientation} orientation
     * 
     * @returns Equivalent point vector in cartesian 2d (x,y) space.
     */
    get_cartesian_coord(orientation: Orientation=undefined): CartesianCoordinate {
        if (orientation === undefined) {
            orientation = Orientation.DEFAULT
        }

        // for each quad digit, calculate unit cartesian vector, and flip+scale by level power
        let quads: Array<string> = this.get_quad_strs()
        let vectors: Array<Vector> = new Array(this.num_levels)
        let level = (
            this.quad_order === TetracoordQuadOrder.HIGH_FIRST ? this.num_levels-1 : 0
        ) + this.power
        let level_even: boolean = level % 2 == 0
        let level_delta: number = this.quad_order === TetracoordQuadOrder.HIGH_FIRST ? -1 : 1
        for (let i=0; i<this.num_levels; i++) {
            const q: string = quads[i]

            // find unit ccoord (level=0)
            let uc: CartesianCoordinate
            switch (q) {
                case '0':
                    uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ZERO)
                    break

                case '1':
                    uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ONE)
                    break

                case '2':
                    uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.TWO)
                    break

                case '3':
                    uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.THREE)
                    break
            }

            let v = new Vector(uc.x, uc.y)
            
            // flip
            if (!level_even) {
                v.rotate(TRIG_PI)
            }

            // scale
            v.multiplyScalar(Math.pow(2, level))

            // add component to vectors
            vectors[i] = v

            level += level_delta
            level_even = !level_even
        }

        let vector: Vector = vectors.reduce((prev: Vector, curr: Vector) => {
            return prev.add(curr)
        })

        return {
            x: vector.x,
            y: vector.y
        }
    }

    equals(other: Tetracoordinate): boolean {
        if (other instanceof Tetracoordinate) {
            let this_quad_str = this.get_quad_strs()
            let other_quad_str = other.get_quad_strs()

            if (this.quad_order != other.quad_order) {
                other_quad_str.reverse()
            }

            return this_quad_str.join('') == other_quad_str.join('')
        }
        else {
            return false
        }
    }

    /**
     * @returns Array of quaternary digit characters expressing the nominal value of this tcoord, without power,
     * according to internal quad order.
     */
    get_quad_strs(): Array<string> {
        let quads = this.get_byte_strs().flat().join().split('')

        // remove leading/trailing zeros to match populated levels
        if (quads.length > this.num_levels) {
            let start: number
            let count: number = quads.length-this.num_levels
            if (this.quad_order === TetracoordQuadOrder.HIGH_FIRST) {
                start = 0
            }
            else {
                start = quads.length-1 - count
            }

            quads.splice(start, count)
        }

        return quads
    }

    /**
     * 
     * @returns Array of byte strings (4 quad digits) expressing the nominal value of this tcoord, without power,
     * accorded to internal quad order.
     */
    get_byte_strs(): Array<string> {
        let byte_strs_q = new Array(this.bytes.byteLength)
        for (let i=0; i<this.bytes.byteLength; i++) {
            byte_strs_q[i] = this.bytes.at(i)
                .toString(4)
                .padStart(Tetracoordinate.LEVELS_PER_BYTE, '0')
        }

        return byte_strs_q
    }

    /**
     * String representation of this tetracoord instance.
     */
    toStringOverride(): string {
        return (
            `tcoord(` +
            `bytes=${this.get_byte_strs().join('-')}q ` + 
            `power=${this.power} order=${this.quad_order} levels=${this.num_levels}` + 
            `)`
        )
    }
}

// Tetracoordinate overrides
Tetracoordinate.prototype.toString = Tetracoordinate.prototype.toStringOverride

/* tcoord to cartesian unit map
up/default
    0 = (    0,    0)
    1 = (    0,    1)
    2 = (-√3/2, -1/2)
    3 = ( √3/2, -1/2)

down
    0 = (    0,    0)
    1 = (    0,   -1)
    2 = ( √3/2,  1/2)
    3 = (-√3/2,  1/2)
*/
Tetracoordinate.unit_to_cartesian.set(Tetracoordinate.ZERO, {x: 0, y: 0})
Tetracoordinate.unit_to_cartesian.set(Tetracoordinate.ONE, {x: 0, y: 1})
Tetracoordinate.unit_to_cartesian.set(Tetracoordinate.TWO, {x: -TRIG_COS_PI_OVER_6, y: -TRIG_SIN_PI_OVER_6})
Tetracoordinate.unit_to_cartesian.set(Tetracoordinate.THREE, {x: TRIG_COS_PI_OVER_6, y: -TRIG_SIN_PI_OVER_6})


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

