import { describe, it } from "mocha"
import assert from "node:assert"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar"
import { RadixType } from "../src/tetracoord/scalar/radix"

function testParsePowerScalar(d: number|string, r: RadixType) {
  try {
    return parsePowerScalar(d as number|string, r as RadixType)
  }
  catch (err) {
    throw new Error(`PowerScalar parse error at d=${d} r=${r}`, {cause: err})
  }
}

describe('scalar', () => {
  describe('PowerScalar', () => {
    it('converts to number', () => {
      let ps: PowerScalar
      let actual: number

      for (let [d, r, expected] of [
        ['5.5', RadixType.D, 5.5],
        [-5.5, RadixType.D, -5.5],
        ['3.2', RadixType.Q, 3.5],
        ['3.1', RadixType.Q, 3.25],
        ['11.01', RadixType.B, 3.25],
        ['3.001', RadixType.Q, 3.015625]
      ]) {

        ps = testParsePowerScalar(d as number|string, r as RadixType)
        actual = ps.toNumber()
        assert.strictEqual(actual, expected, `mismatch at digits=${d} radix=${r} literal=${ps}`)
      }
    })
  })
})