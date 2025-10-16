/**
 * 
 */

// imports

import { Orientation } from "./misc"
import { ByteLevelOrder, imaginary } from "./scalar/byte"
import { BITS_PER_BYTE } from "./scalar/binary"
import { Q_BITS_PER_LEVEL, Q_LEVELS_PER_BYTE, Q_VALUES_PER_LEVEL } from './scalar/quaternary'
import { CartesianCoordinate, Vector2D, TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "./vector2d"
import { digitsToBytes, parsePowerScalar, PowerScalar } from "./scalar"
import { RadixType } from "./scalar/radix"
import { RADIX_PREFIX } from "./calculator/expression"

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

  static imaginary: imaginary = null

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
   
  ```txt
  up/default
      0 = (    0,    0)
      1 = (    0,    1)
      2 = (-√3/2, -1/2)
      3 = ( √3/2, -1/2)
      4 = (    1,    0) imaginary, used for orientation

  down
      0 = (    0,    0)
      1 = (    0,   -1)
      2 = ( √3/2,  1/2)
      3 = (-√3/2,  1/2)
  ```
   */
  static unit_to_cartesian: Map<Tetracoordinate, CartesianCoordinate> = new Map([
    [Tetracoordinate.ZERO, { x: 0, y: 0 }],
    [Tetracoordinate.ONE, { x: 0, y: 1 }],
    [Tetracoordinate.TWO, { x: -TRIG_COS_PI_OVER_6, y: -TRIG_SIN_PI_OVER_6 }],
    [Tetracoordinate.THREE, { x: TRIG_COS_PI_OVER_6, y: -TRIG_SIN_PI_OVER_6 }],

    [Tetracoordinate.NONE, { x: 0, y: -1 }],
    [Tetracoordinate.NTWO, { x: TRIG_COS_PI_OVER_6, y: TRIG_SIN_PI_OVER_6 }],
    [Tetracoordinate.NTHREE, { x: -TRIG_COS_PI_OVER_6, y: TRIG_SIN_PI_OVER_6 }],

    [Tetracoordinate.FOUR, { x: 1, y: 0 }],
    [Tetracoordinate.NFOUR, { x: -1, y: 0 }]
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
   * @param value 
   * @param quad_order Order that the quad digits will be stored in the byte array.
   * @param num_levels Number of significant quaternary digits. Only needed if providing a byte array
   * that could have leading/trailing insignificant zeros.
   * @param powerOffset Offset the default power of `value`.
   */
  constructor(
    value?: Tetracoordinate | Uint8Array | number[] | string,
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
    else if (typeof value === 'string' || value instanceof String) {
      // create tcoord from quaternary str
      this.value = parsePowerScalar(value as string, RadixType.Q, irrational, quad_order)
    }
    else if (value instanceof Tetracoordinate) {
      // clone tcoord
      this.value = value.value.clone()
      num_levels = num_levels !== undefined ? num_levels : value.num_levels
    }
    else if (Array.isArray(value)) {
      // create tcoord from int array
      this.value = new PowerScalar(
        digitsToBytes(value, RadixType.Q, quad_order),
        0,
        irrational,
        quad_order
      )
    }
    else {
      // create tcoord from bytes
      this.value = new PowerScalar(value, 0, irrational, quad_order)
    }

    this.num_levels = (
      num_levels === undefined
      ? (this.value.digits as Uint8Array).byteLength * Tetracoordinate.LEVELS_PER_BYTE
      : num_levels
    )

    if (powerOffset > 0) {
      this.value.power += powerOffset
    }
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
    let vectors: Vector2D[] = new Array(this.num_levels)
    let level = this.num_levels - 1 + this.value.power
    let level_even: boolean = level % 2 == 0
    for (let i = 0; i < this.num_levels; i++) {
      const q: number = Tetracoordinate.reorientDigit(quads[i], orientation)

      // find unit ccoord (level=0)
      let uc: CartesianCoordinate
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
          throw new Error(`invalid quad ${q}`)
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
      if (q === 0) {
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

  negateFromCartesian(): Tetracoordinate {
    let negative = Tetracoordinate.fromCartesianCoord(
      Vector2D.fromObject(this.toCartesianCoord()).multiplyScalar(-1)
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
  addFromCartesian(other: Tetracoordinate): Tetracoordinate {
    let cthis = this.toCartesianCoord()
    let cother = other.toCartesianCoord()

    let sum = Tetracoordinate.fromCartesianCoord(
      { x: cthis.x + cother.x, y: cthis.y + cother.y },
      Math.min(this.value.power, other.value.power)
    )
    this.set(sum)

    return sum
  }

  /**
   * @returns Array of quaternary digit characters expressing the nominal value of this tcoord, without power,
   * according to internal quad order.
   */
  getQuadStrs(): string[] {
    let quads = this.getByteStrs().flat().join('').split('')

    // remove leading/trailing zeros to match populated levels
    if (quads.length > this.num_levels) {
      let count: number = quads.length - this.num_levels
      let start: number = (this.value.levelOrder === ByteLevelOrder.HIGH_FIRST) ? 0 : quads.length - count

      quads.splice(start, count)
    }

    return quads
  }

  /**
   * 
   * @returns Array of byte strings (4 quad digits) expressing the nominal value of this tcoord, without power,
   * accorded to internal quad order.
   */
  getByteStrs(): string[] {
    const bytes = this.value.digits as Uint8Array
    let byte_strs_q = new Array(bytes.byteLength)
    for (let i = 0; i < bytes.byteLength; i++) {
      byte_strs_q[i] = bytes.at(i)
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
      `bytes=${RADIX_PREFIX}${RadixType.Q}${this.getByteStrs().join('-')} ` +
      `power=${this.value.power} order=${this.value.levelOrder} levels=${this.num_levels} ` +
      `irrational=${this.value.irrational}` +
      `)`
    )
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
    ccoord: CartesianCoordinate | Vector2D,
    precision: number = undefined,
    quad_order: ByteLevelOrder = undefined,
    orientation: Orientation = undefined
  ): Tetracoordinate {
    quad_order = (quad_order === undefined) ? ByteLevelOrder.DEFAULT : quad_order

    // dist from cell centroid to edge is 1/2 at level 0
    precision = (precision === undefined) ? 0 : Math.trunc(precision)
    const min_dist = Math.pow(2, precision) / 2

    let target: Vector2D = ccoord instanceof Vector2D ? ccoord : Vector2D.fromObject(ccoord)
    let loc: Vector2D = new Vector2D(0, 0)
    let delta: Vector2D = Vector2D.subtract(target, loc)
    let dist: number = delta.magnitude()
    let prev_loc: Vector2D, prev_delta: Vector2D, prev_dist: number

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
}

// Tetracoordinate overrides
Tetracoordinate.prototype.toString = Tetracoordinate.prototype.toStringOverride

// exports

export default Tetracoordinate
