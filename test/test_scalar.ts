import { describe, it } from "mocha"
import assert from "node:assert"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar"
import { RadixType } from "../src/tetracoord/scalar/radix"

function testParsePowerScalar(d: number|string, r: RadixType, i: boolean) {
  try {
    return parsePowerScalar(d as number|string, r as RadixType, i)
  }
  catch (err) {
    throw new Error(`PowerScalar parse error at d=${d} r=${r}`, {cause: err})
  }
}

describe('scalar', () => {
  describe('PowerScalar', () => {
    let ps: PowerScalar
    let actual: number

    const test = (d: number|string, r: RadixType, expected: number, precision: number = 20, i: boolean = false) => {
      ps = testParsePowerScalar(d as number|string, r as RadixType, i)
      try {
        actual = ps.toNumber()
      }
      catch (err) {
        throw new Error(`PowerScalar.toNumber error at d=${d} ${ps}`, {cause: err})
      }
      
      assert.strictEqual(
        Math.round(actual * precision) / precision, 
        Math.round(expected * precision) / precision, 
        `mismatch at digits=${d} radix=${r} literal=${ps}`
      )
    }

    it('converts to number', () => {
      for (let [d, r, expected] of [
        ['5.5', RadixType.D, 5.5],
        [-5.5, RadixType.D, -5.5],
        ['3.2', RadixType.Q, 3.5],
        ['3.1', RadixType.Q, 3.25],
        ['11.01', RadixType.B, 3.25],
        ['3.001', RadixType.Q, 3.015625]
      ]) {
        test(d, r as RadixType, expected as number)
      }
    })

    it('converts irrational to number', () => {
      for (let [d, r, expected] of [
        // decimal
        ['5.1', RadixType.D, 5 + 1/9],
        ['5.31', RadixType.D, 5.3 + 1/90],

        // quaternary
        ['31', RadixType.Q, 13 + 1/3],
        ['11.31', RadixType.Q, 5.75 + 1/30],

        // binary
        ['0111', RadixType.B, parseInt('1000', 2)],
        ['101.1', RadixType.B, parseInt('110', 2)]
      ]) {
        test(d, r as RadixType, expected as number, 10, true)
      }
    })
  })
})