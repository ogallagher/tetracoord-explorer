import { describe, it } from "mocha"
import assert from "node:assert"
import { ExpressionValue, evalExpression, preparseExpression } from "../src/tetracoord/calculator/expression"
import CartesianCoordinate, { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "../src/tetracoord/vector/cartesian"
import { PowerScalar } from "../src/tetracoord/scalar"
import { Tetracoordinate } from "../src/tetracoord"
import { RadixType } from "../src/tetracoord/scalar/radix"

/**
 * Calls `evalExpression` with additional error details on failure.
 */
function testEvalExpression(expr: string) {
  try {
    return evalExpression(expr as string)
  }
  catch (err) {
    throw new Error(`parse error for input=${expr} preparse=${preparseExpression(expr as string)}`, {cause: err})
  }
}

describe('tetracoord.calculator', () => {
  describe('expression', () => {
    describe('literal', () => {
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
          ['0q320.0i', 'q@320.0~'],
          ['-0q320.0i', '-q@320.0~']
        ]) {
          actual = preparseExpression(input)
          assert.strictEqual(actual, expected)
        }
      })
  
      it('evals scalar literals', () => {
        let actual: ExpressionValue
  
        for (let [input, expected] of [
          // radix prefix
          ['0', 0],
          ['0b01', new PowerScalar({digits: new Uint8Array([0b01])})],
          ['0q31', new PowerScalar({digits: new Uint8Array([0b1101]), radix: RadixType.Q})],
          ['0d95', new PowerScalar({digits: 95})],
  
          // trigonometric constant
          ['cospi6', TRIG_COS_PI_OVER_6],
          ['sinpi6', TRIG_SIN_PI_OVER_6],
  
          // irrational
          ['0d1.5i', new PowerScalar({digits: 15, power: -1, irrational: true})],
          ['0q320.1i', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, irrational: true})],
          ['0q320.1...', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, irrational: true})],
          ['0q320.0i', new PowerScalar({digits: new Uint8Array([0b111000]), radix: RadixType.Q, power: 0, irrational: false})],
          ['0q320.01i', new PowerScalar({digits: new Uint8Array([0b11, 0b10000001]), radix: RadixType.Q, power: -2, irrational: true})],
          ['-0q320.1i', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, sign: -1, irrational: true})],
        ]) {
          actual = testEvalExpression(input as string)
          assert.deepStrictEqual(actual, expected, `mismatch for input=${input}`)
        }
      })
  
      it('evals tcoord vector literals', () => {
        let actual: Tetracoordinate
  
        for (let [input, expected] of [
          ['tc[0q31]', new Tetracoordinate('31')],
          ['tc[0q1.1]', new Tetracoordinate('11', undefined, undefined, -1)],
          ['tc[0b1101]', new Tetracoordinate('31')],
          ['tc[0q312i]', new Tetracoordinate('312', undefined, undefined, undefined, true)],
          ['tc[0q312.1i]', new Tetracoordinate('3121', undefined, undefined, -1, true)],
          ['tc[-0q312.1i]', new Tetracoordinate('-3121', undefined, undefined, -1, true)]
        ]) {
          actual = testEvalExpression(input as string) as Tetracoordinate
          assert.deepStrictEqual(
            actual.value.toString(RadixType.Q), 
            (expected as Tetracoordinate).value.toString(), 
            `mismatch for input=${input} actual=${actual} expected=${expected}`
          )
        }
      })
  
      it('evals ccoord vector literals', () => {
        let actual: CartesianCoordinate
  
        for (let [input, expected] of [
          ['cc[5, 6.1]', new CartesianCoordinate(5, 6.1)],
          ['cc[cospi6, -sinpi6]', new CartesianCoordinate(TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6)],
          [
            'cc[-0q11i, 0q12.1]', 
            new CartesianCoordinate(
              new PowerScalar({digits: new Uint8Array([0b0101]), sign: -1, irrational: true}), 
              new PowerScalar({digits: new Uint8Array([0b011001]), power: -1})
            )
          ]
        ]) {
          actual = testEvalExpression(input as string) as CartesianCoordinate
          assert.deepStrictEqual(actual.toString(), (expected as CartesianCoordinate).toString(), `mismatch for input=${input}`)
        }
      })
    })

    describe('arithmetic', () => {
      describe('scalar', () => {
        it('evals scalar add,subtract', () => {
          let actual: ExpressionValue

          for (let [input, expected] of [
            // subtract
            ['7 - 0.5', 6.5],
            ['0d7 - 0d0.5', new PowerScalar({digits: 6.5})],
            ['cospi6 - sinpi6', TRIG_COS_PI_OVER_6 - TRIG_SIN_PI_OVER_6],
            ['1 - sinpi6', 0.5],
            ['0q3210 - 0q0001', new PowerScalar({digits: new Uint8Array([0b11100011])})],
            ['0q3210 - -0q0001', new PowerScalar({digits: new Uint8Array([0b11100101])})],

            // add
            ['6.5 + 0.5', 7],
            ['0q12.2 + 0.5', new PowerScalar({digits: new Uint8Array([0b0111])})], // 0q12.2 + 0q0.2 = 0q13
            ['-sinpi6 + -sinpi6', -1],
            ['0q32103111 + 0q00200222', new PowerScalar({digits: new Uint8Array([0b11101100, 255])})],
          ]) {
            actual = testEvalExpression(input as string)
            assert.deepStrictEqual(actual, expected, `mismatch for input=${input} actual=${actual} expected=${expected}`)
          }
        })
      })

      describe('vector', () => {

      })
    })
  })
})
