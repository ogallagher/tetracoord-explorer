/**
 * 
 */

// imports

import {
    TetracoordQuadOrder,
    Orientation,
} from './misc'

import {
    CartesianCoordinate,
    Vector2D,
    TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6
} from './vector2d'

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
        this.power = power === undefined ? 0 : power

        if (value === undefined) {
            console.log('debug create tcoord 0')
            this.num_levels = 1
        }
        else if (typeof value === 'string' || value instanceof String) {
            console.log('debug create tcoord from quaternary str')
            this.num_levels = value.length

            let d_arr: Array<number> = []
            for (let i=0; i<value.length; i++) {
                const c: string = value[i]
                if (c === '.') {
                    this.power += (this.quad_order === TetracoordQuadOrder.HIGH_FIRST)
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
            this.num_levels = value.length
            this.set_digits(value)
        }
        else {
            console.log('debug create tcoord from bytes')
            this.num_levels = num_levels === undefined 
                ? value.byteLength * Tetracoordinate.LEVELS_PER_BYTE
                : num_levels
            this.bytes = value
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

    set(other: Tetracoordinate) {
        this.bytes = other.bytes
        this.num_levels = other.num_levels
        this.power = other.power
        this.quad_order = other.quad_order
        this.irrational = other.irrational
    }

    /**
     * Get equivalent cartesian point.
     * 
     * // TODO handle irrational
     * 
     * // TODO handle orientation!=DEFAULT
     * 
     * @param {Orientation} orientation
     * 
     * @returns Equivalent point vector in cartesian 2d (x,y) space.
     */
    to_cartesian_coord(orientation: Orientation=undefined): CartesianCoordinate {
        if (orientation === undefined) {
            orientation = Orientation.DEFAULT
        }

        // for each quad digit, calculate unit cartesian vector, and flip+scale by level power,
        // from highest to lowest power
        let quads: Array<string> = this.get_quad_strs()
        if (this.quad_order === TetracoordQuadOrder.LOW_FIRST) {
            quads.reverse()
        }
        let vectors: Array<Vector2D> = new Array(this.num_levels)
        let level = this.num_levels-1 + this.power
        let level_even: boolean = level % 2 == 0
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
                
                default:
                    console.log(`error invalid quad ${q}`)
            }

            let v = new Vector2D(uc.x, uc.y)
            
            // flip
            if (!level_even) {
                v.multiplyScalar(-1)
            }

            // scale
            v.multiplyScalar(Math.pow(2, level))

            // add component to vectors
            vectors[i] = v

            level--
            if (q === '0') {
                // update flip for entering center cell only
                level_even = !level_even
            }
        }

        let vector: Vector2D = vectors.reduce((prev: Vector2D, curr: Vector2D) => {
            return prev.add(curr)
        })

        return {
            x: vector.x,
            y: vector.y
        }
    }

    /**
     * // TODO handle irrationals
     * 
     * @param other {Tetracoordinate} Other tcoord for comparison.
     * 
     * @returns {boolean} true if the two tcoords are equal.
     */
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

    // arithmetic

    /**
     * Negate this tcoord.
     * 
     * All of the following negated values for nonzero unit tcoord z are equivalent. This
     * method uses the first.
     * 
     * ```
     * -z =  0.z... <-- [-power & -irrational]
     *       x.y...
     *       y.x...
     *      zx.y...
     *      zy.x...
     *      z0.z...
     * ```
     */
    negate(): Tetracoordinate {
        throw new Error('native negate not yet implemented')
        return this
    }

    negate_from_cartesian(): Tetracoordinate {
        let negative = Tetracoordinate.from_cartesian_coord(
            Vector2D.fromObject(this.to_cartesian_coord()).multiplyScalar(-1)
        )
        this.set(negative)

        return negative
    }

    add(other: Tetracoordinate): Tetracoordinate {
        throw new Error('native add not yet implemented')
        return this
    }

    /**
     * 
     * @param other Other tcoord to add.
     * 
     * @returns Self for method chaining.
     */
    add_from_cartesian(other: Tetracoordinate): Tetracoordinate {
        let cthis = this.to_cartesian_coord()
        let cother = other.to_cartesian_coord()

        let sum = Tetracoordinate.from_cartesian_coord(
            {x: cthis.x + cother.x, y: cthis.y + cother.y},
            Math.min(this.power, other.power)
        )
        this.set(sum)

        return sum
    }

    /**
     * @returns Array of quaternary digit characters expressing the nominal value of this tcoord, without power,
     * according to internal quad order.
     */
    get_quad_strs(): Array<string> {
        let quads = this.get_byte_strs().flat().join('').split('')
        
        // remove leading/trailing zeros to match populated levels
        if (quads.length > this.num_levels) {
            let count: number = quads.length-this.num_levels
            let start: number = (this.quad_order === TetracoordQuadOrder.HIGH_FIRST) ? 0 : quads.length - count

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
            `power=${this.power} order=${this.quad_order} levels=${this.num_levels} ` +
            `irrational=${this.irrational}` + 
            `)`
        )
    }

    /**
     * 
     * @param ccoord Cartesian coord to convert.
     * @param precision Precision determines min level for rounding to nearest tcoord.
     * @param quad_order 
     * @param orientation
     * 
     * @returns Equivalent tcoord.
     */
    static from_cartesian_coord(
        ccoord: CartesianCoordinate, 
        precision: number=undefined,
        quad_order: TetracoordQuadOrder=undefined,
        orientation: Orientation=undefined
    ): Tetracoordinate {
        quad_order = (quad_order === undefined) ? TetracoordQuadOrder.DEFAULT : quad_order

        // dist from cell centroid to edge is 1/2 at level 0
        precision = (precision === undefined) ? 0 : Math.trunc(precision)
        const min_dist = Math.pow(2, precision) / 2

        let target: Vector2D = Vector2D.fromObject(ccoord)
        let loc: Vector2D = new Vector2D(0, 0)
        let delta: Vector2D = Vector2D.subtract(target, loc)
        let dist: number = delta.magnitude()
        let prev_loc: Vector2D, prev_delta: Vector2D, prev_dist: number

        // min safe level needed to reach the target
        let scale: number = Math.ceil(Math.log2(delta.magnitude()))
        let power: number = scale
        let flip = (power % 2 != 0) ? -1 : 1

        let quads: Array<number> = []

        // edge case delta.magnitude=0; log2=-inf
        if (!isFinite(scale)) {
            scale = 0
            power = 0
            quads.push(0)
        }

        let angle_ds: Array<number> = new Array(3)
        let step: Vector2D

        const uv_one: Vector2D = Vector2D.fromObject(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ONE))
        const uv_two: Vector2D = Vector2D.fromObject(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.TWO))
        const uv_three: Vector2D = Vector2D.fromObject(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.THREE))

        while (dist > min_dist && power >= precision) {
            // determine closest tcoord nonzero unit vector (direction)
            angle_ds[0] = Vector2D.angleBetween(delta, Vector2D.multiplyScalar(uv_one, flip))
            angle_ds[1] = Vector2D.angleBetween(delta, Vector2D.multiplyScalar(uv_two, flip))
            angle_ds[2] = Vector2D.angleBetween(delta, Vector2D.multiplyScalar(uv_three, flip))

            let angle_min = Math.min(...angle_ds)
            let quad: number
            switch (angle_min) {
                case angle_ds[0]:
                    step = uv_one.clone()
                    quad = 1
                    break

                case angle_ds[1]:
                    step = uv_two.clone()
                    quad = 2
                    break
                
                case angle_ds[2]:
                    step = uv_three.clone()
                    quad = 3
                    break
            }

            // scale step unit vector
            let leg = Math.pow(2, power)
            step.multiplyScalar(leg * flip)

            // update loc
            prev_loc = loc.clone()
            prev_delta = delta
            prev_dist = dist

            loc.add(step)
            delta = Vector2D.subtract(target, loc)
            dist = delta.magnitude()
            /*
            console.log(
                `debug ` + 
                `power=${power} scale=${scale} precision=${precision} ` + 
                `quad=${quad} flip=${flip}\n` +
                `step=${step}\n` + 
                `prev_loc=${prev_loc}\nprev_delta=${prev_delta}\nprev_dist=${prev_dist}\n` +
                `loc=${loc}\ndelta=${delta}\ndist=${dist}`
            )
            */

            // TODO improve threshold for comparing before/after step
            if (dist > prev_dist) {
                // console.log(`debug ${dist} > ${prev_dist} --> quad=${0} -flip=${-flip}`)
                // undo step; stay in zero
                loc = prev_loc
                delta = prev_delta
                dist = prev_dist
                step.zero()
                quads.push(0)

                // flip unit vectors for next level
                flip = -flip
            }
            else {
                // console.log(`debug ${dist} < ${prev_dist} --> quad=${quad} flip=${flip}`)
                // add quad to number
                quads.push(quad)
            }
            power--
        }

        // add fill to significant digits scale-precision
        let fill = new Array((scale+1-precision) - quads.length)
        if (fill.length > 0) {
            fill.fill(0)
            quads = quads.concat(fill)
        }

        // convert raw quads to tcoord; apply power
        power = scale+1 - quads.length

        if (quad_order == TetracoordQuadOrder.LOW_FIRST) {
            quads.reverse()
        }
        return new Tetracoordinate(quads, power, quad_order)
    }
}

// Tetracoordinate overrides
Tetracoordinate.prototype.toString = Tetracoordinate.prototype.toStringOverride

// Tetracoordinate static vars
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

// exports

export default Tetracoordinate
