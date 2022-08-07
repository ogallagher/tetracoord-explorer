/**
 * 2d vector implementation based on victor.
 */

// imports

import Victor from 'victor'

// constants

export const TRIG_PI = Math.PI
export const TRIG_PI_OVER_2 = Math.PI / 2
export const TRIG_2_PI = Math.PI * 2
export const TRIG_PI_OVER_3 = Math.PI / 3
export const TRIG_PI_OVER_6 = Math.PI / 6
export const TRIG_SIN_PI_OVER_6 = 0.5
export const TRIG_COS_PI_OVER_6 = Math.sqrt(3)/2
export const TRIG_SIN_PI_OVER_3 = TRIG_COS_PI_OVER_6
export const TRIG_COS_PI_OVER_3 = TRIG_SIN_PI_OVER_6

// types

/**
 * @deprecated
 */
export enum RotationDirection {
    COUNTER = 1,
    CLOCK = -1,
    DEFAULT = COUNTER
}

// typescript types, interfaces

export interface CartesianCoordinate {
    x: number,
    y: number
}

// classes

export class Vector2D extends Victor {
    constructor(x: number, y: number) {
        super(x, y)
    }

    static fromObject(obj: CartesianCoordinate): Vector2D {
        return new Vector2D(obj.x, obj.y)
    }

    static add(a: Vector2D, b: Vector2D) {
        return new Vector2D(
            a.x + b.x,
            a.y + b.y
        )
    }

    static subtract(a: Vector2D, b: Vector2D) {
        return new Vector2D(
            a.x - b.x,
            a.y - b.y
        )
    }

    static multiplyScalar(a: Vector2D, s: number) {
        return new Vector2D(
            a.x * s,
            a.y * s
        )
    }

    static angleBetween(a: Vector2D, b: Vector2D): number {
        let aa = a.horizontalAngle()
        let ba = b.horizontalAngle()

        let da = Math.abs(aa-ba)
        if (da > TRIG_PI) {
            da = TRIG_2_PI-da
        }

        return da
    }
}
export default Vector2D
