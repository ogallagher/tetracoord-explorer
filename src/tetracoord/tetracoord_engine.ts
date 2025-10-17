/**
 * Tetracoordinate engine.
 */

// imports

import { Orientation } from "./vector/const"
import { TetracoordSpace } from "./tetracoord_space"

// classes

/**
 * Tetracoordinate engine, for managing a full system/model using tcoords.
 */
export class TetracoordEngine {
  tspace: TetracoordSpace

  constructor(orientation: Orientation = undefined) {
    this.tspace = new TetracoordSpace(orientation)
  }

  /**
   * String representation of this tetracoord engine instance.
   */
  toStringOverride(): string {
    return `tengine(\n  tspace=${this.tspace}\n)`
  }
}

// TetracoordEngine overrides

TetracoordEngine.prototype.toString = TetracoordEngine.prototype.toStringOverride

// exports

export default TetracoordEngine
