/**
 * 
 */

// imports

import { Orientation } from "./const"
import { ByteLevelOrder, Imaginary, imaginary } from "../scalar/byte"
import { BITS_PER_BYTE } from "../scalar/binary"
import { Q_BITS_PER_LEVEL, Q_LEVELS_PER_BYTE, Q_VALUES_PER_LEVEL } from "../scalar/quaternary"
import { RawCartesianCoord, CartesianCoordinate, TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "./cartesian"
import { digitsToBytes, parsePowerScalar, PowerScalar } from "../scalar"
import { RadixType } from "../scalar/radix"
import { VEC_ACCESS_OP } from "../calculator/symbol"
import { Pt } from "pts-math"
import { VectorType } from "./const"

// ts types interfaces

export type Quads = number[] | string
export type TetracoordBytes = Uint8Array | imaginary

// classes

/**
 * Tetracoordinate point.
 */
export class Tetracoordinate {
  static VALUES_PER_LEVEL: number = Q_VALUES_PER_LEVEL
  static BITS_PER_LEVEL: number = Q_BITS_PER_LEVEL
  static BITS_PER_BYTE: number = BITS_PER_BYTE
  static LEVELS_PER_BYTE: number = Q_LEVELS_PER_BYTE
  static DEFAULT_MAX_LEVELS: number = Tetracoordinate.LEVELS_PER_BYTE * 1

  // unit tcoords
  static ZERO: Tetracoordinate = new Tetracoordinate('0')
  static ONE: Tetracoordinate = new Tetracoordinate('1')
  static TWO: Tetracoordinate = new Tetracoordinate('2')
  static THREE: Tetracoordinate = new Tetracoordinate('3')
  // irrational unit tcoords
  static NONE: Tetracoordinate = new Tetracoordinate('0.1', undefined, undefined, undefined, true)
  static NTWO: Tetracoordinate = new Tetracoordinate('0.2', undefined, undefined, undefined, true)
  static NTHREE: Tetracoordinate = new Tetracoordinate('0.3', undefined, undefined, undefined, true)
  // imaginary unit tcoords
  static FOUR: Tetracoordinate = new Tetracoordinate('4')
  static NFOUR: Tetracoordinate = new Tetracoordinate('0.4', undefined, undefined, undefined, true)

  /**
   * tcoord to cartesian unit map
   *
   * ```txt
   * up/default
   *    0 = (    0,    0)
   *    1 = (    0,    1)
   *    2 = (-√3/2, -1/2)
   *    3 = ( √3/2, -1/2)
   *    4 = (    1,    0) imaginary, used for orientation
   *
   * down
   *    0 = (    0,    0)
   *    1 = (    0,   -1)
   *    2 = ( √3/2,  1/2)
   *    3 = (-√3/2,  1/2)
   * ```
   */
  static unit_to_cartesian: Map<Tetracoordinate, RawCartesianCoord> = new Map([
    [Tetracoordinate.ZERO, [0, 0]],
    [Tetracoordinate.ONE, [0, 1]],
    [Tetracoordinate.TWO, [-TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6 ]],
    [Tetracoordinate.THREE, [TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6]],

    [Tetracoordinate.NONE, [0, -1]],
    [Tetracoordinate.NTWO, [TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6]],
    [Tetracoordinate.NTHREE, [-TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6]],

    [Tetracoordinate.FOUR, [1, 0]],
    [Tetracoordinate.NFOUR, [-1, 0]]
  ])
  
  /**
   * Byte array (binary) representation of this tcoord. 
   * 
   * Each tcoord digit/place value is represented with 2 bits.
   * Each byte represents up to 4 tcoord digits (8/2=4).
   */
  value: PowerScalar
  /**
   * Number of significant quad digits in this tcoord (can be less than num_bytes*4).
   */
  num_levels: number

  /**
   * @param value Value expressed as another `Tetracoordinate`, a quaternary digit string, a decimal number, a `PowerScalar`, a (binary) byte array, 
   * or an array of quaternary digit integers.
   * @param quad_order Order that the quad digits will be stored in the byte array, if not done already in `value`.
   * @param num_levels Number of significant quaternary digits. Only needed if providing a byte array
   * that could have leading/trailing insignificant zeros.
   * @param powerOffset Offset the default power of `value`.
   */
  constructor(
    value?: Tetracoordinate | string | number | PowerScalar | Uint8Array | number[],
    quad_order?: ByteLevelOrder,
    num_levels?: number,
    powerOffset: number = 0,
    irrational: boolean = false
  ) {
    quad_order = quad_order === undefined ? ByteLevelOrder.DEFAULT : quad_order

    if (value === undefined) {
      // create tcoord 0
      this.value = parsePowerScalar('0', RadixType.Q, irrational, quad_order)
    }
    else if (value instanceof PowerScalar) {
      // create tcoord from power scalar
      this.value = value
    }
    else if (typeof value === 'string' || value instanceof String) {
      // create tcoord from quaternary str
      this.value = parsePowerScalar(value as string, RadixType.Q, irrational, quad_order)
    }
    else if (typeof value === 'number') {
      // create tcoord from decimal number
      this.value = parsePowerScalar(value as number, RadixType.D, irrational, quad_order)
    }
    else if (value instanceof Tetracoordinate) {
      // clone tcoord
      this.value = value.value.clone()
      num_levels = num_levels !== undefined ? num_levels : value.num_levels
    }
    else if (Array.isArray(value)) {
      // create tcoord from int array
      const bytes = digitsToBytes(value, RadixType.Q, quad_order)
      if (bytes !== Imaginary) {
        this.value = new PowerScalar({
          digits: bytes,
          radix: RadixType.Q,
          power: 0,
          irrational,
          levelOrder: quad_order
        })
      }
      else {
        this.value = Imaginary
      }
    }
    else {
      // create tcoord from bytes
      this.value = new PowerScalar({digits: value, radix: RadixType.Q, power: 0, irrational, levelOrder: quad_order})
    }

    this.num_levels = (
      num_levels === undefined
      ? (
        this.value === Imaginary 
        ? 1 
        : this.getQuadStrs().length
      )
      : num_levels
    )

    if (this.value !== Imaginary) {
      this.value.power += powerOffset
    }
  }

  clone() {
    return new Tetracoordinate(this)
  }

  set(other: Tetracoordinate) {
    this.value = other.value.clone()
    this.num_levels = other.num_levels
  }

  /**
   * Get equivalent cartesian point.
   * 
   * // TODO handle irrational
   * 
   * @param {Orientation} orientation
   * 
   * @returns Equivalent point vector in cartesian 2d (x,y) space.
   */
  toCartesianCoord(orientation?: Orientation): CartesianCoordinate {
    if (orientation === undefined) {
      orientation = Orientation.DEFAULT
    }

    // for each quad digit, calculate unit cartesian vector, and flip+scale by level power,
    // from highest to lowest power
    let quads: string[] = this.getQuadStrs()
    if (this.value.levelOrder === ByteLevelOrder.LOW_FIRST) {
      quads.reverse()
    }
    let vectors: Pt[] = new Array(this.num_levels)
    let level = this.num_levels - 1 + this.value.power
    let level_even: boolean = level % 2 == 0
    for (let i = 0; i < this.num_levels; i++) {
      const q: number = Tetracoordinate.reorientDigit(quads[i], orientation)

      // find unit ccoord (level=0)
      let uc: RawCartesianCoord
      switch (q) {
        case 0:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ZERO)
          break

        case 1:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ONE)
          break

        case 2:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.TWO)
          break

        case 3:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.THREE)
          break

        case -1:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.NONE)
          break

        case -2:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.NTWO)
          break

        case -3:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.NTHREE)
          break

        case 4:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.FOUR)
          break

        case -4:
          uc = Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.NFOUR)
          break

        default:
          throw new Error(`invalid quad[${i}<${this.num_levels}]=${q} in ${this}`)
      }

      let v = new Pt(uc)

      // flip
      if (!level_even) {
        v.multiply(-1)
      }

      // scale
      v.multiply(Math.pow(2, level))

      // add component to vectors
      vectors[i] = v

      level--
      if (q === 0) {
        // update flip for entering center cell only
        level_even = !level_even
      }
    }

    let vector = vectors.reduce((prev, curr) => prev.add(curr))

    return CartesianCoordinate.fromRaw(vector)
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
      let this_quad_str = this.getQuadStrs()
      let other_quad_str = other.getQuadStrs()

      if (this.value.levelOrder != other.value.levelOrder) {
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
   * **Formula for single level**
   * 
   * ```txt
   * -z =  0.zi <-- [-power & -irrational]
   *       x.yi
   *       y.xi
   *      zx.yi
   *      zy.xi
   *      z0.zi
   * ```
   * 
   * @returns `this`
   */
  negate(): Tetracoordinate {
    throw new Error('native negate not yet implemented')
  }

  negateFromCartesian(): Tetracoordinate {
    let negative = Tetracoordinate.fromCartesianCoord(
      this.toCartesianCoord().toRaw().multiply(-1)
    )
    this.set(negative)

    return negative
  }

  /**
   * @param other 
   * 
   * @returns `this`
   */
  add(other: Tetracoordinate): Tetracoordinate {
    throw new Error('native add not yet implemented')
  }

  /**
   * @param other Other tcoord to add.
   * 
   * @returns `this`
   */
  addFromCartesian(other: Tetracoordinate): Tetracoordinate {
    let cthis = this.toCartesianCoord()
    let cother = other.toCartesianCoord()

    let sum = Tetracoordinate.fromCartesianCoord(
      CartesianCoordinate.add(cthis, cother),
      Math.min(this.value.power, other.value.power)
    )
    this.set(sum)

    return sum
  }

  /**
   * @param other Other tcoord to subtract.
   * 
   * @returns `this`
   */
  subtractFromCartesian(other: Tetracoordinate): Tetracoordinate {
    let cthis = this.toCartesianCoord()
    let cother = other.toCartesianCoord()

    let diff = Tetracoordinate.fromCartesianCoord(
      CartesianCoordinate.subtract(cthis, cother),
      Math.min(this.value.power, other.value.power)
    )
    this.set(diff)

    return diff
  }

  /**
   * @returns Array of quaternary digit characters expressing the nominal value of this tcoord, without power,
   * according to internal quad order.
   */
  getQuadStrs(): string[] {
    let quads = this.value.toDigitString(RadixType.Q, false).split('')

    if (quads.length > this.num_levels) {
      // remove leading/trailing zeros to match populated levels
      let count: number = quads.length - this.num_levels
      let start: number = (this.value.levelOrder === ByteLevelOrder.HIGH_FIRST) ? 0 : quads.length - count

      quads.splice(start, count)
    }

    return quads
  }

  /**
   * String representation of this tetracoord instance.
   */
  toString(radix: RadixType = RadixType.Q, showOrder: boolean = false, showNumLevels: boolean = false): string {
    let s: string[] = [
      `${VectorType.TCoord}${VEC_ACCESS_OP[0]}`,
      this.value.toString(radix)
    ]

    if (showOrder) {
      s.push(` order=${this.value.levelOrder}`)
    }
    if (showNumLevels) {
      s.push(` levels=${this.num_levels}`)
    }

    return s.join('') + `${VEC_ACCESS_OP[1]}`
  }

  /**
   * Convert a cartesian coordinate to the closest corresponding tetracoordinate.
   * 
   * @param ccoord Cartesian coord to convert.
   * @param precision Precision determines min level for rounding to nearest tcoord.
   * @param quad_order 
   * @param orientation
   * 
   * @returns Equivalent tcoord.
   */
  static fromCartesianCoord(
    ccoord: RawCartesianCoord | CartesianCoordinate,
    precision: number = 0,
    quad_order: ByteLevelOrder = ByteLevelOrder.DEFAULT,
    orientation: Orientation = Orientation.DEFAULT
  ): Tetracoordinate {
    precision = Math.trunc(precision)
    const min_dist = this.cellRadius(precision)

    let target: CartesianCoordinate = ccoord instanceof CartesianCoordinate ? ccoord : CartesianCoordinate.fromRaw(ccoord)
    let loc: Pt = new Pt(0, 0)
    let delta: Pt = target.v.$subtract(loc)
    let dist: number = delta.magnitude()
    let prev_loc: Pt, prev_delta: Pt, prev_dist: number

    // min safe level needed to reach the target
    let scale: number = Math.ceil(Math.log2(delta.magnitude()))
    if (scale < 0) scale = 0
    let power: number = scale
    let flip = (power % 2 != 0) ? -1 : 1

    let quads: number[] = []

    // edge case delta.magnitude=0; log2=-inf
    if (!isFinite(scale)) {
      scale = 0
      power = 0
      quads.push(0)
    }

    let angle_ds: number[] = new Array(3)
    let step: Pt

    const uv_one: Pt = new Pt(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.ONE))
    const uv_two: Pt = new Pt(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.TWO))
    const uv_three: Pt = new Pt(Tetracoordinate.unit_to_cartesian.get(Tetracoordinate.THREE))

    while (dist > min_dist && power >= precision) {
      // determine closest tcoord nonzero unit vector (direction)
      angle_ds[0] = CartesianCoordinate.angleBetween(delta, uv_one.$multiply(flip))
      angle_ds[1] = CartesianCoordinate.angleBetween(delta, uv_two.$multiply(flip))
      angle_ds[2] = CartesianCoordinate.angleBetween(delta, uv_three.$multiply(flip))

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
      step.multiply(leg * flip)

      // update loc
      prev_loc = loc.clone()
      prev_delta = delta
      prev_dist = dist

      loc.add(step)
      delta = target.v.$subtract(loc)
      dist = delta.magnitude()

      // TODO improve threshold for comparing before/after step
      if (dist > prev_dist) {
        // undo step; stay in zero
        loc = prev_loc
        delta = prev_delta
        dist = prev_dist
        step.fill(0)
        quads.push(0)

        // flip unit vectors for next level
        flip = -flip
      }
      else {
        // add quad to number
        quads.push(quad)
      }
      power--
    }

    // add fill to significant digits scale-precision
    let fill = new Array((scale + 1 - precision) - quads.length)
    if (fill.length > 0) {
      fill.fill(0)
      quads = quads.concat(fill)
    }
    else if (quads.length == 0) {
      quads.push(0)
    }

    // convert raw quads to tcoord; apply power
    power = scale + 1 - quads.length

    if (quad_order == ByteLevelOrder.LOW_FIRST) {
      quads.reverse()
    }
    return new Tetracoordinate(quads, quad_order, undefined, power)
  }

  /**
   * @param q A single quaternary digit, corresponding to a raw unit tcoord under default
   * orientation.
   * 
   * @returns Reoriented signed digit, quaternary in all cases, **except** when orientation is `LEFT` or `RIGHT`, 
   * where these imaginary directions are denoted 4 (right) and -4 (left). Datatype is same as `q`.
   */
  static reorientDigit(q: string | number, orientation?: Orientation): number {
    let i = typeof q === 'string' ? Number.parseInt(q) : q

    if (orientation !== undefined) {
      if (i != 0) {
        switch (orientation) {
          case Orientation.LEFT:
            switch (i) {
              case 1:
                i = -4
                break
              case 2:
                i = 3
                break
              case 3:
                i = -2
                break
            }
            break

          case Orientation.DOWN:
            switch (i) {
              case 1:
                i = -1
                break
              case 2:
                i = -2
                break
              case 3:
                i = -3
                break
            }
            break

          case Orientation.RIGHT:
            switch (i) {
              case 1:
                i = 4
                break
              case 2:
                i = -3
                break
              case 3:
                i = 2
                break
            }
            break

          case Orientation.UP:
            // up is default
            break
        }
      }
      // else 0 always 0
    }

    return i
  }

  /**
   * @param level Level of scale/precision, quaternary digit place value. Signed integer.
   * @returns Min distance from the cell centroid to any edge; the furthest away that a vector point can be while still guaranteed within a cell
   * at the given `level`.
   */
  static cellRadius(level: number = 0) {
    // dist from cell centroid to edge is 1/2 at level 0
    return Math.pow(2, level) / 2
  }
}

// exports

export default Tetracoordinate
