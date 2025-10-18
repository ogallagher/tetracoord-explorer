import { ByteLevelOrder, Imaginary, imaginary } from "./byte"
import { B_BITS_PER_LEVEL, B_LEVELS_PER_BYTE, B_VALUES_PER_LEVEL, BITS_PER_BYTE } from "./binary"
import { Q_BITS_PER_LEVEL, Q_LEVELS_PER_BYTE, Q_VALUES_PER_LEVEL } from "./quaternary"
import { RadixType, radixTypeToValue } from "./radix"
import { IRR_SUFFIX_I, NEG_OP, RADIX_PREFIX, WHOL_FRAC_DELIM } from "../calculator/symbol"
import { RawScalar, RawScalarType, Sign } from "./const"

/**
 * Represents a scalar value stored with a custom radix. 
 * 
 * Decimal values are stored as positive integers, and non decimal as byte arrays (`Uint8Array`).
 * Other attributes (ex. {@linkcode PowerScalar.radix radix}, {@linkcode PowerScalar.power power}) are stored separately in order to retrieve the raw value.
 */
export class PowerScalar {
  /**
   * If decimal, raw positive integer. If quaternary or binary, byte array.
   */
  digits: RawScalar
  /**
   * Radix determines values (formatted digit) vs bits per level.
   */
  radix: RadixType
  /**
   * Number of levels to shift the decimal point. Level shift is bit shift multiplied by bits per level, determined by the radix.
   */
  power: number
  /**
   * The sign as `1` or `-1`.
   */
  sign: Sign
  /**
   * Whether least significant digit repeats infinitely as fractional digits after decimal point.
   */
  irrational: boolean
  levelOrder: ByteLevelOrder

  constructor({digits: d, radix: r = undefined, power: p = 0, sign: s = 1, irrational: i = false, levelOrder: o = ByteLevelOrder.DEFAULT} : {
    digits: RawScalar
    radix?: RadixType
    power?: number
    sign?: Sign
    irrational?: boolean 
    levelOrder?: ByteLevelOrder
  }) {
    if (typeof d === 'number' && d < 0) {
      // separate sign from nominal digits
      d *= -1
      s *= -1
    }

    r = r || getDefaultRadix(d)
    if (typeof d === 'number' && r !== RadixType.D) {
      throw new Error(`scalar stored as raw number=${d} not supported for radix=${r}`)
    }

    this.digits = d
    this.radix = r
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
    return new PowerScalar(this)
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
      const bitsPerLevel = this.radix === RadixType.Q ? Q_BITS_PER_LEVEL : B_BITS_PER_LEVEL
      const powerPositive = this.power >= 0

      for (let bi=0; bi < this.digits.byteLength; bi++) {
        // regardless of order, step from least to greatest significant byte
        byte = this.digits.at(this.levelOrder === ByteLevelOrder.LOW_FIRST ? bi : this.digits.byteLength-1-bi)
        
        byte = byte << BITS_PER_BYTE * bi
        if (powerPositive) {
          byte = byte << this.power * bitsPerLevel
        }

        num |= byte
      }

      if (!powerPositive) {
        num /= Math.pow(radixTypeToValue(this.radix), -this.power)
      }
    }

    return num * this.sign
  }

  /**
   * Format nominal digits without radix prefix or irrational suffix.
   * 
   * @param radix Target radix for converting from {@linkcode PowerScalar.radix this.radix}.
   */
  toDigitString(radix?: RadixType, showPower: boolean = true): string {
    radix = radix || this.radix
    const radixValue = radixTypeToValue(radix)

    // format digits
    let digitStr: string
    if (this.radix === RadixType.D) {
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

        digitStr = digitStr.substring(0, pointIndex) + WHOL_FRAC_DELIM + digitStr.substring(pointIndex)
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
      `${RADIX_PREFIX}${radix || this.radix}${digitStr}${irrationalSuffix}`
    )
  }

  private static toNumbers(a: number|PowerScalar, b: number|PowerScalar) {
    const v = {
      a: typeof a === 'number' ? a : a.toNumber(),
      b: typeof b === 'number' ? b : b.toNumber()
    }

    const tr = {
      at: getRawScalarType(a),
      bt: getRawScalarType(b),
      ar: getRadix(a),
      br: getRadix(b)
    }

    return {...v, ...tr}
  }

  /**
   * Add scalars. 
   * 
   * Output {@linkcode RadixType format} is determined by left operand. 
   * 
   * Currently implemented by converting to raw numbers before adding.
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
      return new PowerScalar({ digits: c })
    }
    else {
      return parsePowerScalar(c.toString(radixTypeToValue(n.ar)), n.ar, undefined)
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
      return new PowerScalar({ digits: c })
    }
    else {
      return parsePowerScalar(c.toString(radixTypeToValue(n.ar)), n.ar, undefined)
    }
  }
}

export const getDefaultRadix = (n: RawScalar|PowerScalar): RadixType => (
  typeof (n instanceof PowerScalar ? n.digits : n) === 'number' ? RadixType.D : RadixType.B
)

export const getRadix = (n: number|PowerScalar): RadixType => (
  n instanceof PowerScalar ? n.radix : RadixType.D
)

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
 * @param rawNum Raw (formatted) fractional scalar number without radix.
 * @param levelOrder 
 * @returns Whole scalar formatted digits without radix, power, and sign.
 */
export function parseRawDigits(rawNum: number|string, levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT) {
  let rawStr = (
    typeof rawNum === 'number' 
    // format using arbitrary radix >= maximum supported
    ? rawNum.toString(10) 
    : rawNum
  )

  // extract sign
  let sign: Sign = rawStr.startsWith(NEG_OP) ? -1 : 1
  if (sign === -1) {
    rawStr = rawStr.substring(1)
  }

  let rawDigits: number[] = []
  let c: string
  let power: number = 0
  for (let i = 0; i < rawStr.length; i++) {
    c = rawStr[i]
    if (c === WHOL_FRAC_DELIM) {
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
 * @param radix 
 * @param irrational Whether least significant digit is infinitely repeating. Note this will be overridden as `true` if least significant digit is zero.
 */
export function parsePowerScalar(
  rawNum: number|string,
  radix: RadixType,
  irrational: boolean = false,
  levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT
): PowerScalar|imaginary {
  const { rawDigits, power, sign } = parseRawDigits(rawNum, levelOrder)
  const leastDigitNonzero = rawDigits[levelOrder === ByteLevelOrder.HIGH_FIRST ? rawDigits.length-1 : 0] !== 0

  if (radix === RadixType.D) {
    if (levelOrder === ByteLevelOrder.LOW_FIRST) {
      rawDigits.reverse()
    }

    const digits = Number.parseInt(rawDigits.join(''), 10)

    return new PowerScalar({
      digits,
      power,
      sign,
      irrational: irrational && leastDigitNonzero,
      levelOrder: ByteLevelOrder.HIGH_FIRST
    })
  }
  else {
    const bytes = digitsToBytes(rawDigits, radix, levelOrder)
    if (bytes === Imaginary) {
      return Imaginary
    }

    return new PowerScalar({
      digits: bytes,
      radix,
      power,
      sign,
      irrational: irrational && leastDigitNonzero,
      levelOrder
    })
  }
}