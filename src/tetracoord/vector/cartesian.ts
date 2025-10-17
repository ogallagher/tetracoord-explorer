import { PtLike, Pt } from "pts-math"
import { parsePowerScalar, PowerScalar } from "../scalar"
import { RadixType } from "../scalar/radix"

export const TRIG_PI = Math.PI
export const TRIG_PI_OVER_2 = Math.PI / 2
export const TRIG_2_PI = Math.PI * 2
export const TRIG_PI_OVER_3 = Math.PI / 3
export const TRIG_PI_OVER_6 = Math.PI / 6
export const TRIG_SIN_PI_OVER_6 = 0.5
export const TRIG_COS_PI_OVER_6 = Math.sqrt(3) / 2
export const TRIG_SIN_PI_OVER_3 = TRIG_COS_PI_OVER_6
export const TRIG_COS_PI_OVER_3 = TRIG_SIN_PI_OVER_6

/**
 * @deprecated
 */
export enum RotationDirection {
  COUNTER = 1,
  CLOCK = -1,
  DEFAULT = COUNTER
}

export type RawCartesianCoord = PtLike

export class CartesianCoordinate {
  /**
   * Vector value expressed in simple scalar numbers.
   */
  v: Pt
  x: PowerScalar
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

  magnitude(): number {
    return this.v.magnitude()
  }

  clone(): CartesianCoordinate {
    return new CartesianCoordinate(this.x, this.y)
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

  static multiplyScalar(a: CartesianCoordinate, s: number) {
    return this.fromRaw(a.v.$multiply(s))
  }

  static angleBetween(a: CartesianCoordinate, b: CartesianCoordinate): number {
    let da = Math.abs(a.v.angleBetween(b.v))
    if (da > TRIG_PI) {
      da = TRIG_2_PI - da
    }

    return da
  }
}
export default CartesianCoordinate
