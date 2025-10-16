import { describe, it } from 'mocha'
import assert from 'node:assert'
import { ExpressionTree, IrrationalNumber, parseExpression, RADIX_PREFIX_OP } from '../src/tetracoord/calculator/expression'
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from '../src/tetracoord/vector2d'

describe('tetracoord.calculator', () => {
  describe('expression', () => {
    it('parses scalar literals', () => {
      let actual: ExpressionTree

      for (let [input, expected] of [
        // scalar literal with radix prefix
        ['0', [,0]],
        ['0b01', [RADIX_PREFIX_OP, 'b', [,0b1]]],
        ['0q31', [RADIX_PREFIX_OP, 'q', [,new Uint8Array([0b1101])]]],
        ['0d95', [RADIX_PREFIX_OP, 'd', [,95]]],

        // scalar literal with trigonometric constant
        ['cospi6', [,TRIG_COS_PI_OVER_6]],
        ['sinpi6', [,TRIG_SIN_PI_OVER_6]],

        // scalar literal with irrational
        ['0d1.5i', [,new IrrationalNumber(1, 5)]],
        ['0q320.1i', [,new IrrationalNumber(new Uint8Array([0b111000]), 0b01)]]
      ]) {
        actual = parseExpression(input as string)
        assert.deepStrictEqual(actual, expected)
      }
    })
  })
})
