import { ByteLevelOrder, Imaginary, imaginary } from "./byte"
import { B_BITS_PER_LEVEL, B_LEVELS_PER_BYTE, B_VALUES_PER_LEVEL, BITS_PER_BYTE } from "./binary"
import { Q_BITS_PER_LEVEL, Q_LEVELS_PER_BYTE, Q_VALUES_PER_LEVEL } from "./quaternary"
import { RadixType, radixTypeToValue } from "./radix"
import { IRR_SUFFIX_I, NEG_OP, RADIX_PREFIX } from "../calculator/symbol"

export type RawScalar = number|Uint8Array
export enum RawScalarType {
  Number = 'number',
  Bytes = 'bytes'
}

export class PowerScalar {
  /**
   * If decimal, raw integer. If quaternary or binary, byte array.
   */
  digits: RawScalar
  /**
   * Number of digits to shift the decimal point.
   * 
   * // TODO might currently be number of levels to shift (ex. quaternary power=1 shifts 2 binary digits); be consistent
   */
  power: number
  sign: number
  /**
   * Whether least significant digit repeats infinitely as fractional digits after decimal point.
   */
  irrational: boolean
  levelOrder: ByteLevelOrder

  constructor(d: RawScalar, p: number = 0, s: number = 1, i: boolean = false, o: ByteLevelOrder = ByteLevelOrder.DEFAULT) {
    if (typeof d === 'number' && d < 0) {
      d *= -1
      s *= -1
    }

    this.digits = d
    this.power = p
    this.sign = s
    this.irrational = i
    this.levelOrder = o
  }

  clone() {
    const digits = (
      typeof this.digits === 'number'
      ? this.digits
      : new Uint8Array(this.digits)
    )
    return new PowerScalar(digits, this.power, this.sign, this.irrational, this.levelOrder)
  }

  negate(): PowerScalar {
    this.sign *= -1
    return this
  }

  /**
   * Convert to standard scalar (float) number.
   * 
   * // TODO handle irrational
   */
  toNumber(): number {
    let num: number

    if (typeof this.digits === 'number') {
      // decimal
      num = this.digits * Math.pow(10, this.power)
    }
    else {
      // bytes
      num = 0

      let byte: number
      for (let bi=0; bi < this.digits.byteLength; bi++) {
        // regardless of order, step from least to greatest significant byte
        byte = this.digits.at(this.levelOrder === ByteLevelOrder.LOW_FIRST ? bi : this.digits.byteLength-1-bi)
        num |= (byte << BITS_PER_BYTE * bi + this.power)
      }
    }

    return num * this.sign
  }

  get defaultRadix(): RadixType {
    return (typeof this.digits === 'number') ? RadixType.D : RadixType.B
  }

  /**
   * Format nominal digits without radix prefix or irrational suffix.
   * 
   * @param radix 
   */
  toDigitString(radix?: RadixType, showPower: boolean = true): string {
    const radixCurrent: RadixType = this.defaultRadix
    radix = radix === undefined ? radixCurrent : radix
    const radixValue = radixTypeToValue(radix)

    // format digits
    let digitStr: string
    if (radixCurrent === RadixType.D) {
      digitStr = (this.digits as number).toString(radixValue)
    }
    else {
      const bytes = (this.digits as Uint8Array)
      const byteStrs: string[] = new Array(bytes.byteLength)

      bytes.forEach((byte, index) => {
        byteStrs[index] = byte.toString(radixValue)
      })

      digitStr = byteStrs.join('')
    }

    if (showPower) {
      // format negative power with decimal point
      if (this.power < 0) {
        const pointIndex = (
          this.levelOrder === ByteLevelOrder.HIGH_FIRST
          ? digitStr.length + this.power
          : -this.power
        )

        digitStr = digitStr.substring(0, pointIndex) + '.' + digitStr.substring(pointIndex)
      }
      // format positive power with trailing least significant digit
      else if (this.power > 0) {
        const leastTrail: string = (
          new Array(this.power)
          .fill(
            this.irrational
            ? digitStr[this.levelOrder === ByteLevelOrder.HIGH_FIRST ? digitStr.length-1 : 0]
            : '0'
          )
          .join('')
        )
        
        digitStr = (
          this.levelOrder === ByteLevelOrder.HIGH_FIRST
          ? digitStr + leastTrail
          : leastTrail + digitStr
        )
      }
    }

    return digitStr
  }

  /**
   * Format as scalar literal.
   * 
   * @param radix 
   */
  toString(radix?: RadixType) {
    const digitStr = this.toDigitString(radix)

    // format irrational
    const irrationalSuffix = (this.irrational ? IRR_SUFFIX_I : '')

    return (
      `${RADIX_PREFIX}${radix || this.defaultRadix}${digitStr}${irrationalSuffix}`
    )
  }

  private static toNumbers(a: number|PowerScalar, b: number|PowerScalar) {
    const v = {
      a: typeof a === 'number' ? a : a.toNumber(),
      b: typeof b === 'number' ? b : b.toNumber()
    }

    const t = {
      at: getRawScalarType(a),
      bt: getRawScalarType(b)
    }

    return {...v, ...t}
  }

  /**
   * Add scalars. Output {@linkcode RawScalarType representation} is determined by left operand.
   * 
   * Currently implemented by converting to raw numbers before adding, but if both operands are {@linkcode RawScalarType.Bytes}, then bitwise `|`
   * might be more efficient.
   * 
   * // TODO handle irrational
   * 
   * @param a 
   * @param b 
   */
  static add(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    const n = this.toNumbers(a, b)
    const c = n.a + n.b
    
    if (n.at === RawScalarType.Number) {
      return new PowerScalar(c)
    }
    else {
      return parsePowerScalar(c.toString(2), RadixType.B, undefined)
    }
  }

  /**
   * Subtract scalars. See {@linkcode add}.
   * 
   * // TODO handle irrational
   */
  static subtract(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    const n = this.toNumbers(a, b)
    const c = n.a - n.b
    
    if (n.at === RawScalarType.Number) {
      return new PowerScalar(c)
    }
    else {
      return parsePowerScalar(c.toString(2), RadixType.B, undefined)
    }
  }
}

export const getRawScalarType = (n: RawScalar|PowerScalar) => (
  typeof (n instanceof PowerScalar ? n.digits : n) === 'number' 
  ? RawScalarType.Number 
  : RawScalarType.Bytes
)

/**
 * @param digits Int array where each element is a single digit.
 * @param radix Radix of each digit (level) in `digits` to indicate values per level and levels per byte.
 * @param levelOrder The level order that digits are listed (high first vs low first).
 * 
 * @returns Binary representation as byte array.
 */
export function digitsToBytes(digits: number[], radix: RadixType.B|RadixType.Q, levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT): Uint8Array|imaginary {
  const numLevels = digits.length
  const levelsPerByte = radix === RadixType.B ? B_LEVELS_PER_BYTE : Q_LEVELS_PER_BYTE
  const valuesPerLevel = radix === RadixType.B ? B_VALUES_PER_LEVEL : Q_VALUES_PER_LEVEL
  const bitsPerLevel = radix === RadixType.B ? B_BITS_PER_LEVEL : Q_BITS_PER_LEVEL

  // zero pad digits to fill bytes
  let rem = numLevels % levelsPerByte
  if (rem > 0) {
    let zeros: number[] = new Array(levelsPerByte - rem)
    zeros.fill(0)

    if (levelOrder === ByteLevelOrder.HIGH_FIRST) {
      // leading zeros
      digits = zeros.concat(digits)
    }
    else {
      // trailing zeros
      digits = digits.concat(zeros)
    }
  }

  const bytes = new Uint8Array(Math.ceil(numLevels / levelsPerByte))
  bytes.fill(0)

  const levelIdxOrdered = (di: number) => (
    levelOrder === ByteLevelOrder.HIGH_FIRST
    ? levelsPerByte - 1 - di
    : di
  )
  const byteIdxOrdered = (bi: number) => (
    levelOrder === ByteLevelOrder.HIGH_FIRST
    ? bi
    : bytes.byteLength - 1 - bi
  )

  let byte: number = 0
  let byteIdx: number = 0
  let digitIndex: number = 0
  for (let i = 0; i < digits.length; i++) {
    const li = levelIdxOrdered(digitIndex)
    const bi = byteIdxOrdered(byteIdx)
    const d: number = digits[i]

    if (d < valuesPerLevel) {
      // bit shift to current level in byte
      const l = d << li * bitsPerLevel

      // bitwise OR to set level within byte
      byte |= l

      // console.log(
      //   `debug Bi=${bi} Li=${li} Bb=${byte.toString(2)} Bq=${byte.toString(4)}`
      // )

      // update offsets
      digitIndex++
      if (digitIndex >= levelsPerByte) {
        // write byte to bytes
        bytes.set([byte], bi)

        // next byte
        byteIdx++
        digitIndex = 0
        byte = 0
      }
    }
    else if (d === valuesPerLevel) {
      // imaginary has no value representation
      return null as imaginary
    }
    else {
      throw new Error(`invalid radix=${radix} digit at idx [${i}] = ${d}`)
    }
  }
  if (byteIdx < bytes.byteLength) {
    // write last byte to bytes
    bytes.set([byte], byteIdxOrdered(byteIdx))
  }

  return bytes
}

/**
 * @param rawNum Raw fractional scalar number without radix.
 * @param levelOrder 
 * @returns Whole scalar digits without radix and power.
 */
export function parseRawDigits(rawNum: number|string, levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT) {
  let rawStr = typeof rawNum === 'number' ? rawNum.toString(10) : rawNum

  // extract sign
  let sign = rawStr.startsWith(NEG_OP) ? -1 : 1
  if (sign === -1) {
    rawStr = rawStr.substring(1)
  }

  let rawDigits: number[] = []
  let c: string
  let power: number = 0
  for (let i = 0; i < rawStr.length; i++) {
    c = rawStr[i]
    if (c === '.') {
      power += (
        (levelOrder === ByteLevelOrder.HIGH_FIRST)
        ? -(rawStr.length - 1 - i)
        : -i
      )
    }
    else {
      rawDigits.push(Number.parseInt(c, 10))
    }
  }

  return {
    rawDigits,
    power,
    sign
  }
}

/**
 * @param rawNum Raw fractional scalar number without radix.
 * @param radixType 
 * @param irrational Whether least significant digit is infinitely repeating. Note this will be overridden as `true` if least significant digit is zero.
 */
export function parsePowerScalar(
  rawNum: number|string, 
  radixType: RadixType, 
  irrational: boolean = false,
  levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT
): PowerScalar|imaginary {
  const { rawDigits, power, sign } = parseRawDigits(rawNum, levelOrder)
  const leastDigitNonzero = rawDigits[levelOrder === ByteLevelOrder.HIGH_FIRST ? rawDigits.length-1 : 0] !== 0

  if (radixType === RadixType.D) {
    if (levelOrder === ByteLevelOrder.LOW_FIRST) {
      rawDigits.reverse()
    }

    const digits = Number.parseInt(rawDigits.join(''), 10)

    return new PowerScalar(
      digits,
      power,
      sign,
      irrational && leastDigitNonzero,
      ByteLevelOrder.HIGH_FIRST
    )
  }
  else {
    const bytes = digitsToBytes(rawDigits, radixType, levelOrder)
    if (bytes === Imaginary) {
      return Imaginary
    }

    return new PowerScalar(
      bytes,
      power,
      sign,
      irrational && leastDigitNonzero,
      levelOrder
    )
  }
}