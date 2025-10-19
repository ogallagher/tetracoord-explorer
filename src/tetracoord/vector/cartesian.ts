import { PtLike, Pt } from "pts-math"
import { parsePowerScalar, PowerScalar } from "../scalar"
import { RadixType } from "../scalar/radix"
import { VectorType } from "./const"
import { ITEM_DELIM_OP, VEC_ACCESS_OP } from "../calculator/symbol"

export const TRIG_PI = Math.PI
export const TRIG_PI_OVER_2 = Math.PI / 2
export const TRIG_2_PI = Math.PI * 2
export const TRIG_PI_OVER_3 = Math.PI / 3
export const TRIG_PI_OVER_6 = Math.PI / 6
export const TRIG_SIN_PI_OVER_6 = 0.5
export const TRIG_COS_PI_OVER_6 = Math.sqrt(3) / 2
export const TRIG_SIN_PI_OVER_3 = TRIG_COS_PI_OVER_6
export const TRIG_COS_PI_OVER_3 = TRIG_SIN_PI_OVER_6

export type RawCartesianCoord = PtLike

export class CartesianCoordinate {
  /**
   * Vector value expressed in simple scalar numbers.
   */
  v: Pt
  /**
   * Vector x component as a power scalar.
   */
  x: PowerScalar
  /**
   * Vector x component as a power scalar.
   */
  y: PowerScalar

  constructor(x: number|PowerScalar, y: number|PowerScalar) {
    let _x: number, _y: number

    if (typeof x === 'number') {
      _x = x
      this.x = parsePowerScalar(x, RadixType.D)
    }
    else {
      _x = x.toNumber()
      this.x = x.clone()
    }

    if (typeof y === 'number') {
      _y = y
      this.y = parsePowerScalar(y, RadixType.D)
    }
    else {
      _y = y.toNumber()
      this.y = y.clone()
    }

    this.v = new Pt(_x, _y)
  }

  toRaw(): Pt {
    return new Pt(this.v)
  }

  get magnitude(): number {
    return this.v.magnitude()
  }

  clone(): CartesianCoordinate {
    return new CartesianCoordinate(this.x, this.y)
  }

  negate(): CartesianCoordinate {
    this.v.multiply(-1)
    this.x.negate()
    this.y.negate()

    return this
  }

  /**
   * Calls underlying {@linkcode Pt.equals} with default error/distance threshold of `1e-6`.
   */
  equals(other: CartesianCoordinate) {
    return this.v.equals(other.v)
  }

  toString(radix: RadixType = RadixType.D) {
    let out: string[] = [
      VectorType.CCoord,
      VEC_ACCESS_OP[0],
      this.x.toString(radix),
      ITEM_DELIM_OP,
      this.y.toString(radix),
      VEC_ACCESS_OP[1]
    ]
    return out.join('')
  }

  static fromRaw(v: RawCartesianCoord): CartesianCoordinate {
    return new CartesianCoordinate(v[0], v[1])
  }

  static add(a: CartesianCoordinate, b: CartesianCoordinate) {
    return this.fromRaw(a.v.$add(b.v))
  }

  static subtract(a: CartesianCoordinate, b: CartesianCoordinate) {
    return this.fromRaw(a.v.$subtract(b.v))
  }

  static multiply(a: CartesianCoordinate, s: number|PowerScalar) {
    return this.fromRaw(a.v.$multiply(typeof s === 'number' ? s : s.toNumber()))
  }

  static divide(a: CartesianCoordinate, s: number|PowerScalar) {
    return this.fromRaw(a.v.$divide(typeof s === 'number' ? s : s.toNumber()))
  }

  static pow(a: CartesianCoordinate, s: number|PowerScalar) {
    const _s = typeof s === 'number' ? s : s.toNumber()
    return this.multiply(a, a.v.magnitude() ** (_s - 1))
  }

  /**
   * @returns The _normalized_ angle (in radians) between 2 vectors. Value is always positive and less than PI (acute).
   */
  static angleBetween(a: CartesianCoordinate|Pt, b: CartesianCoordinate|Pt): number {
    const av = (a instanceof CartesianCoordinate) ? a.v : a
    const bv = (b instanceof CartesianCoordinate) ? b.v : b

    let da = Math.abs(av.angleBetween(bv))
    if (da > TRIG_PI) {
      da = TRIG_2_PI - da
    }

    return da
  }
}
export default CartesianCoordinate
