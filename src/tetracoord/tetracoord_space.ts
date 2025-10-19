/**
 * Tetracoordinate space.
 */

// imports

import {
  Orientation
} from "./vector/const"
import {
  Quads,
  Tetracoordinate
} from "./vector/tetracoordinate"
import CartesianCoordinate, {
  TRIG_PI_OVER_2, TRIG_PI_OVER_6, TRIG_PI
} from "./vector/cartesian"
import { Group, GroupLike, Pt } from "pts-math"

// constants

const TCOORD_CELL_ANCHOR_OFFSET: Pt = new Pt(0, 0.25)

// ts types interfaces

// classes

export class TetracoordCell {
  tcoord: Tetracoordinate
  ccoord: CartesianCoordinate
  points: Group
  anchor: Pt
  flip: boolean
  space: TetracoordSpace

  constructor(tcoord: Tetracoordinate, space: TetracoordSpace) {
    this.tcoord = tcoord
    this.ccoord = tcoord.toCartesianCoord()
    this.flip = TetracoordCell.tcoord_cell_flip(tcoord)

    this.anchor = TCOORD_CELL_ANCHOR_OFFSET.clone()

    this.points = new Group(
      new Pt(Math.cos(TRIG_PI_OVER_6 * 3), Math.sin(TRIG_PI_OVER_6 * 3)),
      new Pt(Math.cos(TRIG_PI_OVER_6 * 7), Math.sin(TRIG_PI_OVER_6 * 7)),
      new Pt(Math.cos(TRIG_PI_OVER_6 * 11), Math.sin(TRIG_PI_OVER_6 * 11))
    )

    if (!this.flip) {
      this.anchor.y *= -1
      this.points.multiply(new Pt(1, -1))
    }

    this.space = space
  }

  /**
   * @returns Centroid of the equilateral cell triangle, corresponding to the true cartesian coordinate
   * (raw ccoord is center of bounding box in some graphics libs, like paperjs).
   */
  get_centroid(): Pt {
    return this.ccoord.toRaw().$add(this.anchor)
  }

  get_bounds_center(): Pt {
    return this.ccoord.toRaw()
  }

  get_bounds_center_transformed(): Pt {
    return (
      this.space.orient_point(this.ccoord.toRaw())
      .multiply(this.space.scale)
      .add(this.space.origin)
    )
  }

  /**
   * @returns Set of points scaled and oriented according to parent tspace scale.
   */
  get_points_scaled_oriented(): GroupLike {
    return this.points.map((vector) => {
      return (
        this.space.orient_point(vector)
        .add(this.space.orient_point(this.anchor))
        .multiply(this.space.scale)
      )
    })
  }

  /**
   * 
   * @returns Set of points transformed according to the tcell position and parent tspace.
   */
  get_points_transformed(): GroupLike {
    return this.points.map((vector) => {
      return (
        this.space.orient_point(vector)
        .add(this.space.orient_point(this.anchor))
        .multiply(this.space.scale)
        .add(this.space.origin)
      )
    })
  }

  /**
   * 
   * @param tcoord 
   * @returns 
   */
  static tcoord_cell_flip(tcoord: Tetracoordinate | Quads): boolean {
    let qs: Array<number>
    if (tcoord instanceof Tetracoordinate) {
      // tcoord is tcoord
      qs = tcoord.getQuadStrs().map((qs) => Number.parseInt(qs))
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
  origin: Pt

  /**
   * @param orientation {Orientation} Initial orientation.
   */
  constructor(
    orientation?: Orientation,
    scale?: number,
    origin?: Pt | CartesianCoordinate
  ) {
    orientation === undefined ? orientation = Orientation.DEFAULT : orientation
    scale === undefined ? scale = 1 : scale
    origin === undefined ? origin = new Pt(0, 0) : origin

    this.orientation = orientation
    this.scale = scale
    if (origin instanceof Pt) {
      this.origin = origin
    }
    else {
      this.origin = origin instanceof Pt ? origin : origin.toRaw()
    }
  }

  /**
   * String representation of this tetracoord space instance.
   */
  toStringOverride(): string {
    return (
      `tspace(` +
      `scale=${this.scale} origin=${this.origin} ` +
      `orientation=${this.orientation}` +
      `)`
    )
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
    let vector = (
      ccoord.toRaw()
      // .add(TCOORD_CELL_ANCHOR_OFFSET)
      .subtract(this.origin)
      .divide(this.scale)
    )

    let tcoord = Tetracoordinate.fromCartesianCoord(this.deorient_point(vector))

    return this.tcoord_to_cell(tcoord)
  }

  /**
   * 
   * @param tcoord 
   * @returns Transformed cartesian centroid.
   */
  tcoord_to_centroid(tcoord: Tetracoordinate): Pt {
    let flip = TetracoordCell.tcoord_cell_flip(tcoord)

    let centroid = (
      tcoord.toCartesianCoord().toRaw()
      .add(
        TCOORD_CELL_ANCHOR_OFFSET
        .$multiply(1, flip ? -1 : 1)
      )
    )

    return (
      this.orient_point(centroid)
      .multiply(this.scale)
      .add(this.origin)
    )
  }

  /**
   * Rotate point according to tspace orientation.
   * 
   * @param point Point without translation to tspace origin.
   * 
   * @returns Oriented point.
   */
  orient_point(point: Pt): Pt {
    let op = point.clone()

    switch (this.orientation) {
      case Orientation.LEFT:
        op.rotate2D(TRIG_PI_OVER_2)
        break

      case Orientation.DOWN:
        op.rotate2D(TRIG_PI)
        break

      case Orientation.RIGHT:
        op.rotate2D(3 * TRIG_PI_OVER_2)
        break

      // else don't rotate
    }

    return op
  }

  /**
   * 
   * @param point Point without translation to tspace origin, but still oriented.
   * @returns  Deoriented point.
   */
  deorient_point(point: Pt): Pt {
    let dp = point.clone()

    switch (this.orientation) {
      case Orientation.LEFT:
        dp.rotate2D(-TRIG_PI_OVER_2)
        break

      case Orientation.DOWN:
        dp.rotate2D(-TRIG_PI)
        break

      case Orientation.RIGHT:
        dp.rotate2D(-3 * TRIG_PI_OVER_2)
        break

      // else don't rotate
    }

    return dp
  }
}

// TetracoordSpace overrides

TetracoordSpace.prototype.toString = TetracoordSpace.prototype.toStringOverride

// exports

export default TetracoordSpace
