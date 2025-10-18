import { describe, it } from "mocha"
import assert from "node:assert"
import { ExpressionValue, evalExpression, preparseExpression } from "../src/tetracoord/calculator/expression"
import Ccoord, { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_3, TRIG_SIN_PI_OVER_6 } from "../src/tetracoord/vector/cartesian"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar"
import { Tetracoordinate as Tcoord } from "../src/tetracoord"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { ABS_GROUP_OP, EXP_OP } from "../src/tetracoord/calculator/symbol"

/**
 * Calls `evalExpression` with additional error details on failure.
 */
function testEvalExpression(expr: string) {
  try {
    return evalExpression(expr as string)
  }
  catch (err) {
    throw new Error(`parse-eval error for input=${expr} preparse=${preparseExpression(expr as string)}`, {cause: err})
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
        let actual: Tcoord
  
        for (let [input, expected] of [
          ['tc[0q31]', new Tcoord('31')],
          ['tc[0q1.1]', new Tcoord('11', undefined, undefined, -1)],
          ['tc[0b1101]', new Tcoord('31')],
          ['tc[0q312i]', new Tcoord('312', undefined, undefined, undefined, true)],
          ['tc[0q312.1i]', new Tcoord('3121', undefined, undefined, -1, true)],
          ['tc[-0q312.1i]', new Tcoord('-3121', undefined, undefined, -1, true)],
          ['tc[0q0.2 + 0q0.2]', new Tcoord('1')]
        ]) {
          actual = testEvalExpression(input as string) as Tcoord
          assert.deepStrictEqual(
            actual.value.toString(RadixType.Q), 
            (expected as Tcoord).value.toString(), 
            `mismatch for input=${input} actual=${actual} expected=${expected}`
          )
        }
      })
  
      it('evals ccoord vector literals', () => {
        let actual: Ccoord
  
        for (let [input, expected] of [
          ['cc[5, 6.1]', new Ccoord(5, 6.1)],
          ['cc[cospi6, -sinpi6]', new Ccoord(TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6)],
          [
            'cc[-0q11i, 0q12.1]', 
            new Ccoord(
              new PowerScalar({digits: new Uint8Array([0b0101]), sign: -1, irrational: true}), 
              new PowerScalar({digits: new Uint8Array([0b011001]), radix: RadixType.Q, power: -1})
            )
          ]
        ]) {
          actual = testEvalExpression(input as string) as Ccoord
          assert.deepStrictEqual(actual.toString(), (expected as Ccoord).toString(), `mismatch for input=${input}`)
        }
      })

      it('evals vector conversion', () => {
        let actual: ExpressionValue
        const tcoordCellRadius = Tcoord.cellRadius(0)

        for (let [input, expected] of [
          // tc to cc
          ['cc[tc[0q3]]', new Ccoord(TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6)],
          ['cc[-tc[0q101]]', new Ccoord(0, -3)], // -0q101 === 0q011

          // cc to tc
          ['tc[cc[0, 1]]', new Tcoord('1')],
          ['tc[cc[-cospi6, -sinpi6]]', new Tcoord('2')],
          ['tc[-cc[cospi6, sinpi6]]', new Tcoord('2')]
        ]) {
          actual = testEvalExpression(input as string)
          
          if (actual instanceof Ccoord) {
            const dist = Ccoord.subtract(actual, expected as Ccoord).magnitude
            assert(
              dist < tcoordCellRadius,
              `fuzzy ccoord=${actual} mismatch at input=${input} dist=${dist} cellRadius=${tcoordCellRadius}`
            )
          }
          else if (actual instanceof Tcoord) {
            assert.deepStrictEqual(
              actual, 
              expected, 
              `tcoord mismatch at input=${input} actual=${actual} expected=${expected}`
            )
          }
        }
      })
    }),

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
            ['0q3210 - 0q0001', new PowerScalar({digits: new Uint8Array([0b11100011]), radix: RadixType.Q})],
            ['0q3210 - +0q0001', new PowerScalar({digits: new Uint8Array([0b11100011]), radix: RadixType.Q})],
            ['0q3210 - -0q0001', new PowerScalar({digits: new Uint8Array([0b11100101]), radix: RadixType.Q})],

            // add
            ['6.5 + 0.5', 7],
            ['0q12.2 + 0.5', new PowerScalar({digits: new Uint8Array([0b0111]), radix: RadixType.Q})], // 0q12.2 + 0q0.2 = 0q13
            ['0q12.2 + 0b0.1', new PowerScalar({digits: new Uint8Array([0b0111]), radix: RadixType.Q})],
            ['-sinpi6 + -sinpi6', -1],
            ['0q32103111 + 0q00200222', new PowerScalar({digits: new Uint8Array([0b11101100, 255]), radix: RadixType.Q})]
          ]) {
            actual = testEvalExpression(input as string)
            if (typeof expected === 'number') {
              assert.strictEqual(actual, expected, `mismatch for input=${input} actual=${actual} expected=${expected}`)
            }
            else {
              assert.deepStrictEqual(actual, expected, `mismatch for input=${input} actual=${actual} expected=${expected}`)
            }
          }
        })
      })

      describe('vector', () => {
        it('evals vector add,subtract', () => {
          let actual: ExpressionValue

          for (let [input, expected] of [
            // subtract
            ['cc[7,5] - cc[2,-2]', new Ccoord(5, 7)],
            ['cc[0d7, 0q11] - cc[0b10, -0b10]', new Ccoord(5, 7)],
            ['tc[0q1] - tc[0q0.2 + 0q0.2]', new Tcoord('0')],

            // add
            ['cc[4.5, +5] + cc[0.5, -5]', new Ccoord(5, 0)],
            ['tc[0q1] + -tc[0q3]', new Tcoord('32')],
            ['tc[0q1] + tc[0q3] + tc[0q3]', new Tcoord('21')],
            ['tc[0q1] + tc[-cc[cospi6, -sinpi6]]', new Tcoord('32')] // mixed types
          ]) {
            actual = testEvalExpression(input as string)
            assert.deepStrictEqual(
              expected instanceof Ccoord ? (actual as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
              expected instanceof Ccoord ? (expected as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
              `mismatch for input=${input} actual=${actual} expected=${expected}`
            )
          }
        })
      })

      describe('semiscalar', () => {
        it('evals semiscalar multiply,divide', () => {
          let actual: ExpressionValue

          for (let [input, expected] of [
            // multiply
            ['55 * 0.1', 5.5],
            ['0q313 * 0.1', parsePowerScalar(5.5, RadixType.D)],
            ['5 * 0q23 * 0.1', parsePowerScalar(5.5, RadixType.D)],
            ['5 * 11 * 0.1', 5.5],
            ['0q10 * -0b01', parsePowerScalar(-4, RadixType.D)],
            ['cc[6,4] * 1.5', new Ccoord(9, 6)],
            ['0d1.0 * cc[6*1.5, 4*1.5]', new Ccoord(9, 6)],
            ['tc[0q2] * 0d3', new Tcoord('202')],
            ['0d3 * tc[0q2]', new Tcoord('202')],
            ['-3.0 * tc[0q2]', new Tcoord('22')],

            // divide
            ['55 / 11 / 10', 0.5],
            ['0b110111 / 0q23 / 0.1', parsePowerScalar('0.1', RadixType.B)],
            ['cc[9,6] / 1.5', new Ccoord(6, 4)],
            ['cc[9/1.5, 6/1.5] / 2', new Ccoord(3, 2)],
            ['tc[0q202] / 0d3', new Tcoord('2')],
            ['tc[0q22] / -3.0', new Tcoord('2')],
          ]) {
            actual = testEvalExpression(input as string)
            if (typeof expected === 'number') {
              assert.strictEqual(
                (actual as number|PowerScalar).toString(10), 
                expected.toString(10), 
                `mismatch for input=${input} actual=${actual} expected=${expected}`
              )
            }
            else {
              assert.deepStrictEqual(
                expected instanceof Ccoord ? (actual as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                expected instanceof Ccoord ? (expected as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                `mismatch for input=${input} actual=${actual} expected=${expected}`
              )
            }
          }
        })

        it('evals semiscalar exponent', () => {
          let actual: ExpressionValue

          for (let [input, expected] of [
            // scalar
            ['2 ** 4', 16],
            ['2 ** 16 ** 0.5', 16], // exponent evaluates right to left
            ['2 ** 0q100 ** 0b0.1', parsePowerScalar(16, RadixType.D)],
            
            // ccoord
            ['cc[-1,2] ** 3', new Ccoord(-1 * 5, 2 * 5)],
            ['3 ** cc[-1,2]', new Error('not commutative and left must be vector')],

            // tcoord
            ['tc[0q2] ** 0d3', new Tcoord('2')],
            ['tc[0q303] ** 0d2', new Tcoord('330')],
            ['0d3 ** tc[0q2]', new Error('not commutative and left must be vector')]
          ]) {
            if (expected instanceof Error) {
              assert.throws(() => testEvalExpression(input as string))
            }
            else {
              actual = testEvalExpression(input as string)
              if (typeof expected === 'number') {
                assert.strictEqual(
                  (actual as number|PowerScalar).toString(10), 
                  expected.toString(10), 
                  `mismatch for input=${input} actual=${actual} expected=${expected}`
                )
              }
              else {
                assert.deepStrictEqual(
                  expected instanceof Ccoord ? (actual as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                  expected instanceof Ccoord ? (expected as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                  `mismatch for input=${input} actual=${actual} expected=${expected}`
                )
              }
            }
          }
        })

        it('evals semiscalar abs,magnitude', () => {
          let actual: ExpressionValue, _actual: number, _expected: number
          const maxError = 1e-7

          for (let [input, expected] of [
            // scalar
            ['|-2|', 2],
            ['|0-2|', 2],
            ['|-0b01|', parsePowerScalar('01', RadixType.B)],
            ['|0q10 * -0b01|', parsePowerScalar('10', RadixType.Q)],
            ['|0q10 * -0b01 + 1 - |-1||', parsePowerScalar('10', RadixType.Q)], // |4 * -1 + 1 - 1| == |-4|
            ['||-|-1| + 0q10 * -0b01 + 1||', parsePowerScalar(4, RadixType.D)],
            ['1|2', new Error(`${ABS_GROUP_OP[0]} for scalar absolute value is a group operator`)],
            
            // ccoord
            ['|-cc[0,1]|', 1],

            // tcoord
            ['|-tc[1]|', 1],
            ['|tc[|-2|]|', 1]
          ]) {
            if (expected instanceof Error) {
              assert.throws(() => testEvalExpression(input as string))
            }
            else {
              actual = testEvalExpression(input as string)
              _actual = typeof actual === 'number' ? actual : (actual as PowerScalar).toNumber()
              _expected = typeof expected === 'number' ? expected : (expected as PowerScalar).toNumber()

              assert(
                Math.abs(_actual - _expected) < maxError,
                `mismatch error=${_actual - _expected} for input=${input} actual=${actual} expected=${expected}`
              )
            }
          }
        })
      })
    })
  })
})
