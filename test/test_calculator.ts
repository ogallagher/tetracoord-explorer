import { describe, it } from 'mocha'
import assert from 'node:assert'
import { ExpressionTree, parseExpression, preparseExpression } from '../src/tetracoord/calculator/expression'
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from '../src/tetracoord/vector2d'
import { PowerScalar } from '../src/tetracoord/scalar'

describe('tetracoord.calculator', () => {
  describe('expression', () => {
    it('preparses scalar literals', () => {
      let actual: string

      for (let [input, expected] of [
        // radix prefix
        ['0', '0'],
        ['0b01', 'b@01'],
        ['0q31', 'q@31'],
        ['0d95', 'd@95'],

        // irrational
        ['0d1.5i', 'd@1.5~'],
        ['0q320.1i', 'q@320.1~'],
        ['0q320.1...', 'q@320.1~'],
        ['0q320.0i', 'q@320.0~']
      ]) {
        actual = preparseExpression(input)
        assert.strictEqual(actual, expected)
      }
    })

    it('parses scalar literals', () => {
      let actual: ExpressionTree

      for (let [input, expected] of [
        // radix prefix
        ['0', [,0]],
        ['0b01', [,new PowerScalar(new Uint8Array([0b01]))]],
        ['0q31', [,new PowerScalar(new Uint8Array([0b1101]))]],
        ['0d95', [,new PowerScalar(95)]],

        // trigonometric constant
        ['cospi6', [,TRIG_COS_PI_OVER_6]],
        ['sinpi6', [,TRIG_SIN_PI_OVER_6]],

        // irrational
        ['0d1.5i', [,new PowerScalar(15, -1, true)]],
        ['0q320.1i', [,new PowerScalar(new Uint8Array([0b11100001]), -1, true)]],
        ['0q320.1...', [,new PowerScalar(new Uint8Array([0b11100001]), -1, true)]],
        ['0q320.0i', [,new PowerScalar(new Uint8Array([0b111000]), 0, false)]],
        ['0q320.01i', [,new PowerScalar(new Uint8Array([0b11, 0b10000001]), -2, true)]]
      ]) {
        try {
          actual = parseExpression(input as string)
        }
        catch (err) {
          throw new Error(`parse error for input=${input} preparse=${preparseExpression(input as string)}`, {cause: err})
        }
        
        assert.deepStrictEqual(actual, expected, `mismatch for input=${input}`)
      }
    })
  })
})
