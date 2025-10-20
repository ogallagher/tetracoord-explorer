import { describe, it } from "mocha"
import assert from "node:assert"
import { ExpressionInnerValue, evalExpression, preparseExpression } from "../src/tetracoord/calculator/expression"
import Ccoord, { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "../src/tetracoord/vector/cartesian"
import { parsePowerScalar, PowerScalar } from "../src/tetracoord/scalar"
import { Tetracoordinate as Tcoord } from "../src/tetracoord"
import { RadixType } from "../src/tetracoord/scalar/radix"
import { ABS_GROUP_OP } from "../src/tetracoord/calculator/symbol"

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

describe('tetracoord', () => {
  describe('calculator', () => {
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
          ['0q320.0i', 'q@320.0'],
          ['-0q320.0i', '-q@320.0']
        ]) {
          actual = preparseExpression(input)
          assert.strictEqual(actual, expected)
        }
      })
  
      it('evals scalar literals', () => {
        let actual: ExpressionInnerValue
  
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
          ['7.0i', 7],
          ['0q320.1i', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, irrational: true})],
          ['0q320.1...', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, irrational: true})],
          ['0q320.0i', new PowerScalar({digits: new Uint8Array([0b111000]), radix: RadixType.Q, power: 0, irrational: false})],
          ['0q320.01i', new PowerScalar({digits: new Uint8Array([0b11, 0b10000001]), radix: RadixType.Q, power: -2, irrational: true})],
          ['-0q320.1i', new PowerScalar({digits: new Uint8Array([0b11100001]), radix: RadixType.Q, power: -1, sign: -1, irrational: true})],

          // misc
          [
            '0q1103.2222222222', 
            new PowerScalar({
              digits: new Uint8Array(['11','0322','2222','2222'].map(b => parseInt(b, 4))), 
              radix: RadixType.Q,
              power: -10
            })
          ]
        ]) {
          actual = testEvalExpression(input as string)
          if (typeof expected === 'number') {
            assert.strictEqual(actual, expected, `mismatch for input=${input}`)
          }
          else {
            assert.deepStrictEqual(actual, expected, `mismatch for input=${input}`)
          }
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
            'cc[-0q11, 0q12.1]', 
            new Ccoord(
              new PowerScalar({digits: new Uint8Array([0b0101]), sign: -1}), 
              new PowerScalar({digits: new Uint8Array([0b011001]), radix: RadixType.Q, power: -1})
            )
          ]
        ]) {
          actual = testEvalExpression(input as string) as Ccoord
          assert.deepStrictEqual(actual.toString(), (expected as Ccoord).toString(), `mismatch for input=${input}`)
        }
      })

      it('evals rational,irrational vector conversion', () => {
        let actual: ExpressionInnerValue
        const tcoordCellRadius = Tcoord.cellRadius(0)

        for (let [input, expected] of [
          // tc to cc
          ['cc[tc[0q3]]', new Ccoord(TRIG_COS_PI_OVER_6, -TRIG_SIN_PI_OVER_6)],
          ['cc[-tc[0q101]]', new Ccoord(0, -3)], // -0q101 === 0q011
          ['cc[-tc[0q101.1i]]', new Ccoord(0, -2)],
          ['cc[-tc[0q101i]]', new Ccoord(0, -2)],
          ['cc[tc[0q3i]]', new Ccoord(2*TRIG_COS_PI_OVER_6, -2*TRIG_SIN_PI_OVER_6)],
          ['cc[tc[0q0.3i]]', new Ccoord(-TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6)],

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
    })

    describe('arithmetic', () => {
      describe('scalar', () => {
        let actual: ExpressionInnerValue

        const test = (input: string, expected: number|PowerScalar, maxError = 0) => {
          actual = testEvalExpression(input)
          if (typeof expected === 'number') {
            assert(
              Math.abs((actual as number) - expected) <= maxError, 
              `mismatch for input=${input} actual=${actual} expected=${expected}`
            )
          }
          else {
            assert(
              Math.abs((actual as PowerScalar).toNumber() - (expected as PowerScalar).toNumber()) <= maxError, 
              `mismatch for input=${input} actual=${actual} expected=${expected}`
            )
          }
        }

        it('evals scalar rational add,subtract', () => {
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
            test(input as string, expected as number|PowerScalar)
          }
        })

        it('evals scalar irrational add,subtract', () => {
          for (let [input, expected] of [
            // subtract
            ['7.0i - 0.50i', 6.5], // not actually irrational
            ['0d7.1i - 0d0.53i', new PowerScalar({digits: (7 + 1/9) - (0.5 + 3/90)})],
            ['1.9i - sinpi6', new PowerScalar({digits: 1+(9/9) - 0.5})],
            ['0q3210.1i - 0q0001.1i', new PowerScalar({digits: new Uint8Array([0b11100011]), radix: RadixType.Q})],
            ['0q3210 - -0q0001', new PowerScalar({digits: new Uint8Array([0b11100101]), radix: RadixType.Q})],

            // add
            ['6.5i + 0.5i', new PowerScalar({digits: 6+(5/9) + (5/9)})],
            ['0q12.2 + 0.5', new PowerScalar({digits: new Uint8Array([0b0111]), radix: RadixType.Q})], // 0q12.2 + 0q0.2 = 0q13
            ['0q12.2 + 0b0.1', new PowerScalar({digits: new Uint8Array([0b0111]), radix: RadixType.Q})],
            ['-sinpi6 + -sinpi6', -1],
            ['0q32103111 + 0q00200222', new PowerScalar({digits: new Uint8Array([0b11101100, 255]), radix: RadixType.Q})]
          ]) {
            test(input as string, expected as number|PowerScalar, 1e-7)
          }
        })
      })

      describe('vector', () => {
        it('evals vector add,subtract', () => {
          let actual: ExpressionInnerValue

          for (let [input, expected] of [
            // subtract
            ['cc[7,5] - cc[2,-2]', new Ccoord(5, 7)],
            ['cc[0d7, 0q11] - cc[0b10, -0b10]', new Ccoord(5, 7)],
            ['tc[0q1] - tc[0q0.2 + 0q0.2]', new Tcoord('0')],
            ['tc[0q1.00] - tc[0q0.03]', new Tcoord('1.03')],

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

        it('evals irrational vector add,subtract', () => {
          let actual: ExpressionInnerValue
          const maxError = 1e-8

          for (let [input, expected] of [
            // tc
            ['tc[0.2i] + tc[3]', new Tcoord('21')],
            ['tc[0.2i] + tc[3]', new Ccoord(2*TRIG_COS_PI_OVER_6, 0)],

            // cc
            ['cc[3.9i, 2i] + cc[1, -0.2i]', new Ccoord(5, 2)],
            ['cc[3.9i, 2i] - cc[-1, 0.2i]', new Ccoord(5, 2)]
          ]) {
            actual = testEvalExpression(input as string)
            const _actual = (actual instanceof Ccoord) ? actual : (actual as Tcoord).toCartesianCoord()
            const _expected = (expected instanceof Ccoord) ? expected : (expected as Tcoord).toCartesianCoord()

            const dist = Ccoord.subtract(_actual, _expected).magnitude
            assert(
              dist < maxError,
              `fuzzy ccoord=${actual} mismatch at input=${input} dist=${dist} maxError=${maxError}`
            )
          }
        })
      })

      describe('semiscalar', () => {
        function test(input: string, actual: ExpressionInnerValue, expected: ExpressionInnerValue, maxError?: number) {
          if (typeof expected === 'number' || expected instanceof PowerScalar) {
            // scalar
            if (maxError !== undefined) {
              const _actual = typeof actual === 'number' ? actual : (actual as PowerScalar).toNumber()
              const _expected = typeof expected === 'number' ? expected : (expected as PowerScalar).toNumber()

              assert(
                Math.abs(_actual - _expected) < maxError,
                `mismatch error=${_actual - _expected} for input='${input}'`
                + ` actual=${actual}=${_actual} expected=${expected}`
              )
            }
            else {
              assert.strictEqual(
                (actual as number|PowerScalar).toString(10), 
                expected.toString(10), 
                `mismatch for input=${input} actual=${actual} expected=${expected}`
              )
            }
          }
          else {
            // vector
            if (maxError !== undefined) {
              const _actual = actual instanceof Tcoord ? actual.toCartesianCoord() : actual
              const _expected = expected instanceof Tcoord ? expected.toCartesianCoord() : expected
              const dist = Ccoord.subtract(_actual as Ccoord, _expected as Ccoord).magnitude
              assert(
                dist < maxError,
                `fuzzy vector=${actual} expected=${expected} mismatch at input=${input} dist=${dist} maxError=${maxError}`
              )
            }
            else {
              assert.strictEqual(
                expected instanceof Ccoord ? (actual as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                expected instanceof Ccoord ? (expected as Ccoord).toString(RadixType.D) : (actual as Tcoord).toString(), 
                `mismatch for input=${input} actual=${actual} expected=${expected}`
              )
            }
          }
        }

        it('evals semiscalar multiply,divide', () => {
          let actual: ExpressionInnerValue

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
            ['0b110111 / 0q23 / 10', parsePowerScalar('0.1', RadixType.B)],
            ['cc[9,6] / 1.5', new Ccoord(6, 4)],
            ['cc[9/1.5, 6/1.5] / 2', new Ccoord(3, 2)],
            ['tc[0q202] / 0d3', new Tcoord('2')],
            ['tc[0q22] / -3.0', new Tcoord('2')],
          ]) {
            actual = testEvalExpression(input as string)
            test(input as string, actual, expected as ExpressionInnerValue)
          }
        })

        it('evals semiscalar exponent', () => {
          let actual: ExpressionInnerValue

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
              test(input as string, actual, expected as ExpressionInnerValue)
            }
          }
        })

        it('evals semiscalar abs,magnitude', () => {
          let actual: ExpressionInnerValue
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
              test(input as string, actual, expected as ExpressionInnerValue, maxError)
            }
          }
        })

        it('evals semiscalar irrational mult,div,exp,abs', () => {
          let actual: ExpressionInnerValue

          for (let [input, expected] of [
            // multiply
            ['55.3i * 0.1', 5.5 + 1/30],
            ['0q313.1i * 0.1', parsePowerScalar(5.5 + 1/30, RadixType.D)],
            ['5.3i * 0q22 * 0.1', parsePowerScalar(5.3 + 1/30, RadixType.D)],
            ['cc[5.9i, 3.9i] * 1.5', new Ccoord(9, 6)],
            ['0d3i * cc[6*1.5, 4*1.5]', new Ccoord(9 * (10/3), 6 * (10/3))],
            ['tc[0.2i] * 0d3', new Tcoord('22')],
            ['-3.0 * tc[0q0.2i]', new Tcoord('202')],

            // divide
            ['0b110110.1i / 0q23 / 10', parsePowerScalar('0.1', RadixType.B)],
            ['cc[9/1.5, 6/1.5] / 1.9i', new Ccoord(3, 2)],
            ['tc[303] / 3', new Tcoord('3')],
            // requires tc-->cc with irrational
            ['tc[0q22] / 0d3', new Tcoord('0.2', undefined, undefined, undefined, true)],
            ['tc[0q202] / -3.0', new Tcoord('0.2', undefined, undefined, undefined, true)],

            // exponent
            ['1.9i ** 4', 16],
            ['cc[-1,1.9i] ** 3', new Ccoord(-1 * 5, 2 * 5)],
            ['tc[0q0.2i] ** 0d3', new Tcoord('0.2', undefined, undefined, undefined, true)],

            // abs
            ['|-2i|', 2 + 2/9],
            ['|-cc[0.5i,1i]|', ((5/9)**2 + (1 + 1/9)**2) ** 0.5],
            ['|tc[-2]|', 1]
          ]) {
            actual = testEvalExpression(input as string)
            test(input as string, actual, expected as ExpressionInnerValue, 1e-7)
          }
        })
      })
    })

    describe('boolean logic, comparison', () => {
      describe('comparison equality', () => {
        it('evals equality of tcoord vectors', () => {
          let actual: boolean
          
          for (let [a, b, expected] of [
            ['tc[-32]', 'tc[12]', true],
            ['tc[-32]', '-tc[32]', true],
            ['tc[12]', 'tc[-12]', false],
            ['tc[1103.1]', 'tc[1103.100000001]', false],
            ['tc[1103.2i]', 'tc[1103.222222i]', true],
            ['tc[32i]', 'tc[23.333i]', true],
            ['tc[0.2i] * 0d3', 'tc[22]', true]
          ]) {
            const _a = testEvalExpression(a as string) as Tcoord
            const _b = testEvalExpression(b as string) as Tcoord
    
            actual = _a.equals(_b)
            assert.strictEqual(
              actual, 
              expected,
              (
                `expected ${_a}=${_a.toCartesianCoord()} ${expected ? '==' : '!='} ${_b}=${_b.toCartesianCoord()}`
                + `; cellRadius=${Tcoord.cellRadius(Math.min(_a.value.power, _b.value.power))}`
              )
            )
          }
        })

        it('evals strict scalar and vector equality', () => {
          let actual: boolean

          for (let [idx, [input, expected]] of [
            // tcoord
            ['tc[-32] === tc[12]', true],
            ['tc[-32] !== tc[12]', false],
            ['tc[-32] === -tc[32]', true],
            ['tc[-32] === -cc[tc[32]]', Error('mixed vector types')],
            ['tc[1103.1] !== tc[1103.100000001]', true],
            ['tc[0q1] + -tc[0q3] === tc[32]', true],
            ['tc[0q22] / 0d3 === tc[0.2i]', true],
            ['tc[22] === -tc[202]', true],

            // ccoord
            ['cc[7,5] - cc[2,-2] === cc[5, 7]', true],
            ['cc[0d7, 0q11] - cc[0b10, -0b10] !== cc[5, 7]', false],
            ['-cc[1/9, 2/9] === cc[-0d0.1i, -0d0.2i]', true],

            // vector cast
            ['cc[tc[0q3]] === cc[cospi6, -sinpi6]', true],
            ['cc[-tc[0q101]] === cc[0, -3]', true], // -0q101 === 0q011
            ['cc[-tc[0q101.1i]] === cc[0, -2]', true],

            ['tc[cc[3*cospi6, 3*-sinpi6]] / 3 === tc[3]', true],
            ['tc[cc[3*cospi6, 3*sinpi6]] === -tc[202]', true],
            ['tc[0q202] / -3.0 === tc[cc[cospi6, sinpi6]]', true],

            // scalar
            ['-32 === -0d32', Error('mixed scalar types')],
            ['0q32 === 0b1110', true],
            ['0q32 !== 0b1110', false],
            ['(0d0 + 0q32i) === 0d14.6i', true],
            ['0q32i === (0q0 + 0d14.6i)', true]
          ].entries()) {
            if (expected instanceof Error) {
              assert.throws(() => testEvalExpression(input as string))
            }
            else {
              actual = testEvalExpression(input as string) as boolean
              assert.strictEqual(
                actual, 
                expected as boolean, 
                `mismatch at case[${idx}] input=${input}`
              )
            }
          }
        })
      })
    })

    describe('groups and operation order', () => {
      it('evals groups', () => {
        let actual: ExpressionInnerValue
  
        for (let [input, expected] of [
          // scalar
          ['((((12))+(1-1)))', 12],
          ['(1+2)*(3+1)**0.5', 6],
          ['(0d1 + 0b10) * (0q3 + 1) ** 0b0.1', parsePowerScalar(6, RadixType.D)],
          ['cospi6**(1+1)', TRIG_COS_PI_OVER_6**2],
  
          // ccoord
          ['cc[3, (2*2)]', new Ccoord(3, 4)],
  
          // tcoord
          ['tc[(0d2 * 0d2)]', new Tcoord(parsePowerScalar(4, RadixType.D))],
          ['tc[(2 * 2)]', new Tcoord(parsePowerScalar('10', RadixType.Q))] // implied radix=q for tcoord
        ]) {
          actual = testEvalExpression(input as string)
          if (typeof expected === 'number') {
            assert.strictEqual(actual, expected, `mismatch for input=${input}`)
          }
          else {
            assert.deepStrictEqual(actual, expected, `mismatch for input=${input}`)
          }
        }
      })
    })
  })
})
