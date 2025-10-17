/**
 * Tetracoordinates package.
 */

// imports

import { ByteLevelOrder } from "./scalar/byte"
import { TRIG_PI, TRIG_PI_OVER_2, TRIG_PI_OVER_3, TRIG_PI_OVER_6, CartesianCoordinate } from "./vector/cartesian"
import { Tetracoordinate } from "./vector/tetracoordinate"
import { TetracoordSpace, TetracoordCell } from "./tetracoord_space"
import { TetracoordEngine } from "./tetracoord_engine"
import { Orientation } from "./vector/const"

// exports

export {
  Orientation, ByteLevelOrder as TetracoordQuadOrder,
  TRIG_PI, TRIG_PI_OVER_2, TRIG_PI_OVER_3, TRIG_PI_OVER_6, CartesianCoordinate as Vector2D,
  Tetracoordinate,
  TetracoordSpace, TetracoordCell,
  TetracoordEngine
}

export default TetracoordEngine
