import { parse, nary, token, err, unary } from 'subscript'
import { PREC_ACCESS, PREC_TOKEN } from 'subscript/const'
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from '../vector2d'
import { parsePowerScalar, PowerScalar, RawScalar } from '../scalar'
import { RadixType } from '../scalar/radix'

export const RADIX_PREFIX = '0'
export const RADIX_PREFIX_OP = '@'
export const IRR_SUFFIX_I = 'i'
export const IRR_SUFFIX_DOTS = '...'
export const IRR_SUFFIX_OP = '~'
export const COSPI6_CONST = 'cospi6'
export const SINPI6_CONST = 'sinpi6'

// parser handle literal number radix prefix as <radix> @ <raw-fractional-value>
nary(RADIX_PREFIX_OP, PREC_ACCESS)
// parser handle literal number irrational suffix as <raw-fractional-value> ~
unary(IRR_SUFFIX_OP, PREC_ACCESS+1, true)
// parser handle trig constant
token(COSPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_COS_PI_OVER_6])
token(SINPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_SIN_PI_OVER_6])

export type ExpressionLeaf = string|RawScalar|PowerScalar|null|undefined
export type ExpressionTree = (ExpressionLeaf|ExpressionTree)[]

/**
 * Translate true tetracoord calculator expression to intermediate syntax for parser compatibility.
 * 
 * This step would not be necessary with more exact parser customization.
 * 
 * @param str 
 * @returns 
 */
export function preparseExpression(str: string): string {
  const pattern = new RegExp(
    [
      // radix prefix
      `${RADIX_PREFIX}([${RadixType.B}${RadixType.Q}${RadixType.D}])`,
      // irrational suffix
      `(\\d)${IRR_SUFFIX_I}`,
      `(\\d)\\.\\.\\.`
    ].map(p => `(${p})`).join('|'), 
    'g'
  )

  let matcher: RegExpExecArray|null
  let match: string[]
  let matchStr: string
  let strParts = []
  let cursor = 0
  while ((matcher = pattern.exec(str)) !== null) {
    strParts.push(str.substring(cursor, matcher.index))

    match = matcher.filter((v) => v !== undefined)
    matchStr = match[0]
    if (matchStr.endsWith(IRR_SUFFIX_I) || matchStr.endsWith(IRR_SUFFIX_DOTS)) {
      const digit = match[2]
      strParts.push(`${digit}${IRR_SUFFIX_OP}`)
    }
    else if (matchStr.startsWith(RADIX_PREFIX)) {
      const radix = match[2]
      strParts.push(`${radix}${RADIX_PREFIX_OP}`)
    }
    else {
      throw new Error(`cannot preparse invalid match=${matchStr} for pattern=${pattern}`)
    }

    cursor = pattern.lastIndex
  }
  strParts.push(str.substring(cursor))

  return strParts.join('')
}

function parseScalarNode(node: ExpressionTree, radixType: RadixType): PowerScalar {
  const op = node[0]
  const a = node[1]

  if (op === undefined) {
    // [ a=<rational-value>]
    return parsePowerScalar(a as number, radixType)
  }
  else if (op === IRR_SUFFIX_OP) {
    // [~ a=[ <value>]]
    return parsePowerScalar(a[1] as number, radixType, true)
  }
  else {
    throw new Error(`invalid raw number node=${node}`)
  }
}

// TODO extend parseExpressionTree to handle execute during traversal 
function parseExpressionTree(node: ExpressionTree) {
  const op = node[0]
  const a = node[1]
  const b = node[2]

  if (op === RADIX_PREFIX_OP) {
    // convert [@ a=<radix-type> b=<scalar-node>] to [ PowerScalar]
    const r = a as RadixType
    const v = parseScalarNode(b as ExpressionTree, r)
    return [, v]
  }
  else {
    return node
  }
}

export function parseExpression(expr: string) {
  expr = preparseExpression(expr)
  
  const tree = parseExpressionTree(parse(expr))
  return tree
}