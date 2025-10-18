import { parse } from "./parser"
import CartesianCoordinate from "../vector/cartesian"
import { parsePowerScalar, PowerScalar } from "../scalar"
import { RadixType } from "../scalar/radix"
import { VectorType } from "../vector/const"
import Tetracoordinate from "../vector/tetracoordinate"
import { ABS_GROUP_OP, DIV_OP, EXP_OP, IRR_SUFFIX_DOTS, IRR_SUFFIX_I, IRR_SUFFIX_OP, ITEM_DELIM_OP, MUL_OP, NEG_OP, POS_OP, RADIX_PREFIX, RADIX_PREFIX_OP, VEC_ACCESS_OP } from "./symbol"

type ExpressionValueSingleton = number|PowerScalar|Tetracoordinate|CartesianCoordinate
/**
 * Used for values like {@linkcode CartesianCoordinate ccoords} that consume a list of components.
 */
class ExpressionValueCollection {
  constructor(public items: ExpressionValueSingleton[]) {}
}
export type ExpressionValue = ExpressionValueSingleton|ExpressionValueCollection

export type ExpressionLeaf = ExpressionValue|string|null|undefined
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

function parseSemiscalarOperands(a: ExpressionValueSingleton, b: ExpressionValueSingleton, commutative: boolean = true) {
  let semiscalar: boolean
  if (a instanceof Tetracoordinate || a instanceof CartesianCoordinate) {
    semiscalar = true
  }
  if (!semiscalar && b instanceof Tetracoordinate || b instanceof CartesianCoordinate) {
    semiscalar = true
    if (!commutative) {
      // operator is not commutative
      throw new Error (`operands must be vector left=${a}, scalar right=${b}`)
    }
    // swap operands for vector as left
    const _a = a; a = b; b = _a
  }

  return { semiscalar, a, b }
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

function evalNegate(a: ExpressionValueSingleton): ExpressionValueSingleton {
  if (typeof a === 'number') {
    return -a
  }
  else if (a instanceof PowerScalar) {
    return a.negate()
  }
  else if (a instanceof Tetracoordinate) {
    return a.negateFromCartesian()
  }
  else if (a instanceof CartesianCoordinate) {
    return a.negate()
  }
}

function evalAbs(a: ExpressionValueSingleton): ExpressionValueSingleton {
  if (typeof a === 'number') {
    return Math.abs(a)
  }
  else if (a instanceof PowerScalar) {
    return PowerScalar.abs(a)
  }
  else if (a instanceof Tetracoordinate) {
    return a.magnitudeFromCartesian
  }
  else if (a instanceof CartesianCoordinate) {
    return a.magnitude
  }
}

function evalAddSub(op: '-'|'+', a: ExpressionValueSingleton, b: ExpressionValueSingleton): ExpressionValueSingleton {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return op === NEG_OP ? a - b : a + b
  }
  else {
    if (a instanceof PowerScalar || b instanceof PowerScalar) {
      // power scalar
      return (
        op === NEG_OP
        ? PowerScalar.subtract(a as number|PowerScalar, b as number|PowerScalar)
        : PowerScalar.add(a as number|PowerScalar, b as number|PowerScalar)
      )
    }
    else if (a instanceof Tetracoordinate && b instanceof Tetracoordinate) {
      // tcoord vector
      return (
        op === NEG_OP
        ? a.clone().subtractFromCartesian(b)
        : a.clone().addFromCartesian(b)
      )
    }
    else if (a instanceof CartesianCoordinate && b instanceof CartesianCoordinate) {
      // ccoord vector
      return (
        op === NEG_OP
        ? CartesianCoordinate.subtract(a, b)
        : CartesianCoordinate.add(a, b)
      )
    }
    else {
      // mixed vector
      throw new Error(`vector binary add/subtract not supported for mixed types; convert first. a=${a} b=${b}`)
    }
  }
}

function evalMulDiv(op: '*'|'/', a: ExpressionValueSingleton, b: ExpressionValueSingleton): ExpressionValueSingleton {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return op === MUL_OP ? a * b : a / b
  }
  else {
    let {semiscalar, a: _a, b: _b} = parseSemiscalarOperands(a, b, op === '*')

    if (semiscalar) {
      if (_a instanceof Tetracoordinate) {
        return (
          op === MUL_OP
          ? _a.clone().multiplyFromCartesian(_b as number|PowerScalar)
          : _a.clone().divideFromCartesian(_b as number|PowerScalar)
        )
      }
      else {
        return (
          op === MUL_OP
          ? CartesianCoordinate.multiply(_a as CartesianCoordinate, _b as number|PowerScalar)
          : CartesianCoordinate.divide(_a as CartesianCoordinate, _b as number|PowerScalar)
        )
      }
    }
    else if (_a instanceof PowerScalar || _b instanceof PowerScalar) {
      // power scalar
      return (
        op === MUL_OP
        ? PowerScalar.multiply(_a as number|PowerScalar, _b as number|PowerScalar)
        : PowerScalar.divide(_a as number|PowerScalar, _b as number|PowerScalar)
      )
    }
    else {
      // unknown, probably vector
      throw new Error(`binary multiply/divide not supported for given types a=${a} b=${b}`)
    }
  }
}

function evalPow(a: ExpressionValueSingleton, b: ExpressionValueSingleton): ExpressionValueSingleton {
  if (typeof a === 'number' && typeof b === 'number') {
    // simple scalar
    return a ** b
  }
  else {
    let {semiscalar, a: _a, b: _b} = parseSemiscalarOperands(a, b, false)

    if (semiscalar) {
      if (_a instanceof Tetracoordinate) {
        return _a.clone().powFromCartesian(_b as number|PowerScalar)
      }
      else {
        return CartesianCoordinate.pow(_a as CartesianCoordinate, _b as number|PowerScalar)
      }
    }
    else if (_a instanceof PowerScalar || _b instanceof PowerScalar) {
      return PowerScalar.pow(_a as number|PowerScalar, _b as number|PowerScalar)
    }
  }
}

/**
 * Both parses and evaluates the expression abstract syntax tree from the given root node.
 */
function parseExpressionTree(node: ExpressionTree, radixCtx: RadixType = RadixType.D): ExpressionValue {
  const op = node[0]
  const a = node[1]
  const b = node[2]

  if (op === RADIX_PREFIX_OP) {
    // convert [@ a=<radix-type> b=<scalar-node>] to PowerScalar
    const r = a as RadixType
    return parseScalarNode(b as ExpressionTree, r)
  }
  else if (op === IRR_SUFFIX_OP) {
    // convert implied radix [~ a=<scalar-node>] to PowerScalar
    return parseScalarNode(node, radixCtx)
  }
  else if (op === NEG_OP || op === POS_OP) {
    const _a = parseExpressionTree(a as ExpressionTree)

    if (b === undefined) {
      // unary
      if (op === NEG_OP) {
        // negate 
        return evalNegate(_a as ExpressionValueSingleton)
      }
      else {
        // positive (identity)
        return _a
      }
    }
    else {
      // binary
      const _b = parseExpressionTree(b as ExpressionTree)
      return evalAddSub(op, _a as ExpressionValueSingleton, _b as ExpressionValueSingleton)
    }
  }
  else if (op === ABS_GROUP_OP && b === undefined) {
    return evalAbs(parseExpressionTree(a as ExpressionTree) as ExpressionValueSingleton)
  }
  else if (op === MUL_OP || op === DIV_OP) {
    return evalMulDiv(
      op,
      parseExpressionTree(a as ExpressionTree) as ExpressionValueSingleton,
      parseExpressionTree(b as ExpressionTree) as ExpressionValueSingleton
    )
  }
  else if (op === EXP_OP) {
    return evalPow(
      parseExpressionTree(a as ExpressionTree) as ExpressionValueSingleton,
      parseExpressionTree(b as ExpressionTree) as ExpressionValueSingleton
    )
  }
  else if (op === ITEM_DELIM_OP) {
    // return collection of values
    return new ExpressionValueCollection(node.slice(1).map(i => parseExpressionTree(i as ExpressionTree, radixCtx) as ExpressionValueSingleton))
  }
  else if (op === VEC_ACCESS_OP && (a === VectorType.CCoord || a === VectorType.TCoord)) {
    const _b = parseExpressionTree(b as ExpressionTree, a === VectorType.CCoord ? RadixType.D : RadixType.Q)

    if (_b instanceof CartesianCoordinate || _b instanceof Tetracoordinate) {
      // vector type conversion
      if ((a === VectorType.CCoord && _b instanceof CartesianCoordinate) || (a === VectorType.TCoord && _b instanceof Tetracoordinate)) {
        // identity
        return _b
      }
      else if (a === VectorType.CCoord) {
        // tcoord --> ccoord
        return (_b as Tetracoordinate).toCartesianCoord()
      }
      else {
        // ccoord --> tcoord
        return Tetracoordinate.fromCartesianCoord(_b as CartesianCoordinate)
      }
    }
    else if (a === VectorType.CCoord) {
      // convert ['[]' a='cc' b=[',' <x> <y>]] to CartesianCoordinate
      const [_x, _y] = (_b as ExpressionValueCollection).items
      return new CartesianCoordinate(_x as number, _y as number)
    }
    else {
      // convert ['[]' a='tc' b=[ <scalar-node>]] to Tetracoordinate
      return new Tetracoordinate(_b as number|PowerScalar)
    }
  }
  else if (op !== undefined) {
    // operator expression
    const isLeaf = (n: ExpressionLeaf|ExpressionTree) => !Array.isArray(n) || n[0] === undefined

    const _a = isLeaf(a) ? a : parseExpressionTree(a as ExpressionTree)

    if (b === undefined) {
      // unary operation
      throw new Error(`unsupported unary operation ${[op, _a]}`)
    }
    else {
      // binary operation
      const _b = isLeaf(b) ? b : parseExpressionTree(b as ExpressionTree)

      throw new Error(`unsupported binary operation ${[op, _a, _b]}`)
    }
  }
  else {
    // literal
    return a as ExpressionValue
  }
}

export function evalExpression(expr: string) {
  expr = preparseExpression(expr)
  
  const tree = parseExpressionTree(parse(expr))
  return tree
}