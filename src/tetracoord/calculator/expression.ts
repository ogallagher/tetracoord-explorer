import { parse, nary, token, err } from 'subscript'
import { PREC_ACCESS, PREC_TOKEN } from 'subscript/const'
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from '../vector2d'

// parser handle literal numbers with radix prefixes
export const RADIX_PREFIX_OP = '@'
nary(RADIX_PREFIX_OP, PREC_ACCESS)
// parser handle trig constants
token('cospi6', PREC_TOKEN, a => a ? err() : [, TRIG_COS_PI_OVER_6])
token('sinpi6', PREC_TOKEN, a => a ? err() : [, TRIG_SIN_PI_OVER_6])

export type ExpressionLeaf = string|number|IrrationalNumber|null|undefined
export type ExpressionTree = (ExpressionLeaf|ExpressionTree)[]

export class IrrationalNumber {
  rationalDigits: number|Uint8Array
  /**
   * Least significant digit that repeats infinitely.
   */
  irrationalDigit: number
  /**
   * Number of digits to shift the decimal point. `1` assumes irrational digit is first after decimal point.
   */
  power: number

  constructor(r: number|Uint8Array, i: number, p: number = 1) {
    this.power = p
    this.rationalDigits = r
    this.irrationalDigit = i
  }
}

export function parseExpression(str: string) {
  // unfortunately I don't know how to correctly register these syntax rules in the parser directly
  const radixPrefixPattern = /0([bqd])/g
  let radixPrefixMatcher: RegExpExecArray|null
  let strParts = []
  let cursor = 0
  while ((radixPrefixMatcher = radixPrefixPattern.exec(str)) !== null) {
    strParts.push(str.substring(cursor, radixPrefixMatcher.index))

    const radix = radixPrefixMatcher[1]
    strParts.push(`${radix}${RADIX_PREFIX_OP}`)

    cursor = radixPrefixPattern.lastIndex
  }
  strParts.push(str.substring(cursor))

  const expr = parse(strParts.join('')) as ExpressionTree
  return expr
}