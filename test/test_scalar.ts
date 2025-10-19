import { describe, it } from "mocha"
import assert from "node:assert"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { ByteLevelOrder } from "../src/tetracoord/scalar/byte"

function testParsePowerScalar(d: number|string, r: RadixType, i: boolean, o?: ByteLevelOrder) {
  try {
    return parsePowerScalar(d as number|string, r as RadixType, i, o)
  }
  catch (err) {
    throw new Error(`PowerScalar parse error at d=${d} r=${r}`, {cause: err})
  }
}

describe('scalar', () => {
  describe('PowerScalar', () => {
    let ps: PowerScalar
    let actual: number

    const testNumeric = (d: number|string, r: RadixType, expected: number, precision: number = 20, i: boolean = false, o?: ByteLevelOrder) => {
      ps = testParsePowerScalar(d as number|string, r as RadixType, i, o)
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
      for (let [d, r, expected, order] of [
        ['5.5', RadixType.D, 5.5],
        [-5.5, RadixType.D, -5.5],
        ['3.2', RadixType.Q, 3.5],
        ['3.1', RadixType.Q, 3.25],
        ['11.01', RadixType.B, 3.25],
        ['3.001', RadixType.Q, 3.015625],
        ['1103.2222222222', RadixType.Q, 83.66666603088379],
        ['2222222222.3011', RadixType.Q, 83.66666603088379, ByteLevelOrder.LOW_FIRST],
        ['11.2020202020202020', RadixType.Q, 5.5 + 1/30] // requires bytes-->bigint-->number implementation
      ]) {
        testNumeric(d, r as RadixType, expected as number, undefined, undefined, order as ByteLevelOrder)
      }
    })

    it('converts irrational to number', () => {
      for (let [d, r, expected] of [
        // decimal
        ['5.1', RadixType.D, 5 + 1/9],
        ['5.31', RadixType.D, 5.3 + 1/90],
        ['14.6', RadixType.D, 14 + 2/3],

        // quaternary
        ['31', RadixType.Q, 13 + 1/3],
        ['11.31', RadixType.Q, 5.75 + 1/30],
        ['32', RadixType.Q, 14 + 2/3],

        // binary
        ['0111', RadixType.B, parseInt('1000', 2)],
        ['101.1', RadixType.B, parseInt('110', 2)]
      ]) {
        testNumeric(d, r as RadixType, expected as number, 10, true)
      }
    })

    it('checks equality', () => {
      let actual: boolean

      for (let [a, b, expected] of [
        [
          parsePowerScalar(52.1, RadixType.D, true, ByteLevelOrder.HIGH_FIRST), 
          parsePowerScalar('1.25', RadixType.D, true, ByteLevelOrder.LOW_FIRST),
          true
        ],
        [
          parsePowerScalar(5.9, RadixType.D, true), 
          parsePowerScalar('101.1', RadixType.B, true),
          true
        ],
        [
          parsePowerScalar(5.9, RadixType.D, true, ByteLevelOrder.HIGH_FIRST), 
          parsePowerScalar('1.101', RadixType.B, true, ByteLevelOrder.LOW_FIRST),
          true
        ],
        [
          parsePowerScalar(5.5, RadixType.D, false), 
          parsePowerScalar('101.1', RadixType.B, true),
          false
        ],
        [
          parsePowerScalar('11.3', RadixType.Q, true), 
          parsePowerScalar('101.1', RadixType.B, true),
          true
        ],
        [
          parsePowerScalar('11.32132', RadixType.Q, true, ByteLevelOrder.HIGH_FIRST), 
          parsePowerScalar('23123.11', RadixType.Q, true, ByteLevelOrder.LOW_FIRST),
          true
        ]
      ]) {
        const _a = a as PowerScalar
        const _b = b as PowerScalar

        actual = _a.equals(_b)
        assert.strictEqual(
          actual, 
          expected,
          (
            `expected ${_a}[o=${_a.levelOrder}]=`
            + _a.toString(_a.radix)
            + `=${_a.toNumber()} ${expected ? '==' : '!='} ${_b}[o=${_b.levelOrder}]=`
            + _b.toString(_a.radix, undefined, _a.levelOrder)
            + `=${_b.toNumber()}`
          )
        )
      }
    })
  })
})