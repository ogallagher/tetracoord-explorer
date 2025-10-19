import { ByteLevelOrder, Imaginary, imaginary } from "./byte"
import { B_BITS_PER_LEVEL, B_LEVELS_PER_BYTE, B_VALUES_PER_LEVEL, BITS_PER_BYTE } from "./binary"
import { Q_BITS_PER_LEVEL, Q_LEVELS_PER_BYTE, Q_VALUES_PER_LEVEL } from "./quaternary"
import { RadixType, radixToIrrDen, radixTypeToValue, radixValueToType } from "./radix"
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
  /**
   * Order that levels are stored within each byte, and that the bytes are stored in the byte array.
   */
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
   */
  toNumber(signed: boolean = true): number {
    let num: number
    let irrDigit: string
    const radix: number = radixTypeToValue(this.radix)

    if (typeof this.digits === 'number') {
      // decimal
      num = (
        (
          this.levelOrder === ByteLevelOrder.HIGH_FIRST 
          ? this.digits 
          : Number.parseInt([...this.digits.toString(radix)].toReversed().join(''), radix)
        )
        * 10 ** this.power
      )

      // irrational digit
      if (this.irrational) {
        const str = this.digits.toString(radix)
        irrDigit = str[this.levelOrder === ByteLevelOrder.HIGH_FIRST ? str.length-1 : 0]
      }
    }
    else {
      // bytes
      let bigint: bigint = 0n
      let smallByte: number
      let byte: bigint
      const bitsPerLevel = this.radix === RadixType.Q ? Q_BITS_PER_LEVEL : B_BITS_PER_LEVEL
      const powerPositive = this.power >= 0

      // digits and +power
      for (let bi=0; bi < this.digits.length; bi++) {
        // regardless of order, step from greatest to least significant byte
        smallByte = this.digits.at(this.levelOrder === ByteLevelOrder.HIGH_FIRST ? bi : this.digits.length-1-bi)

        if (this.levelOrder === ByteLevelOrder.LOW_FIRST) {
          // reverse levels in byte
          smallByte = byteReverseLevels(smallByte, radix)
        }
        
        // left shift byte to place value (+power if positive)
        byte = BigInt(smallByte)
        byte = byte << BigInt(
          BITS_PER_BYTE * (this.digits.length-1-bi)
          + (powerPositive ? this.power * bitsPerLevel : 0)
        )

        bigint |= byte
      }

      // bigint to number
      num = Number(bigint)

      // -power
      if (!powerPositive) {
        num *= radix ** this.power
      }

      // irrational digit
      if (this.irrational) {
        const irrByteDigits: string = (
          (
            this.levelOrder === ByteLevelOrder.LOW_FIRST 
            ? this.digits.at(0)
            : this.digits.at(this.digits.length-1)
          ) as number
        ).toString(radix)
        irrDigit = irrByteDigits[this.levelOrder === ByteLevelOrder.LOW_FIRST ? 0 : irrByteDigits.length-1]
      }
    }

    if (this.irrational) {
      // add irrational trailing least significant digits
      const irrFrac = (
        // digit
        Number.parseInt(irrDigit, radix)
        // power
        * radix ** this.power
        // denominator
        / radixToIrrDen(this.radix)
      )

      num += irrFrac
    }

    return signed ? num * this.sign : num
  }

  /**
   * Format nominal (positive) digits without radix prefix or irrational suffix.
   * 
   * @param radix Target radix for converting from {@linkcode PowerScalar.radix this.radix}.
   */
  toDigitString(radix?: RadixType, showPower: boolean = true): string {
    radix = radix || this.radix

    if (this.radix === radix) {
      const fromRadix = radixTypeToValue(this.radix)

      // format digits in fromRadix
      let digitStr: string
      if (this.radix === RadixType.D) {
        digitStr = (this.digits as number).toString(fromRadix)
      }
      else {
        digitStr = (
          (this.digits as Uint8Array).values()
          .map((byte, index) => {
            let s = byte.toString(fromRadix)
            const levelsPerByte = this.radix === RadixType.B ? B_LEVELS_PER_BYTE : Q_LEVELS_PER_BYTE

            if (
              this.levelOrder === ByteLevelOrder.HIGH_FIRST
              ? (index > 0)
              : (index < (this.digits as Uint8Array).length-1)
            ) {
              return (
                this.levelOrder === ByteLevelOrder.HIGH_FIRST
                ? s.padStart(levelsPerByte, '0')
                : s.padEnd(levelsPerByte, '0')
              )
            }
            else {
              return s
            }
          })
          .toArray()
          .join('')
        )
      }

      // format power
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
    else {
      // convert radix with Number.toString
      const toRadix = radixTypeToValue(radix)
      return this.toNumber(false).toString(toRadix)
    }
  }

  /**
   * @param precision Rounds difference to this many digits after decimal point.
   * @returns Whether equal to `other` scalar.
   */
  equals(other: PowerScalar, precision: number = 8) {
    return 0 === (
      Math.round(
        (this.toNumber() - other.toNumber()) * 10**precision
      ) / 10**precision
    )
  }

  /**
   * Format as scalar literal.
   * 
   * @param radix 
   * @param showRadixPrefix
   * @param levelOrder Format as the requested level order. 
   * Default is to use {@linkcode PowerScalar.levelOrder existing order}.
   */
  toString(radix?: RadixType|number, showRadixPrefix: boolean = true, levelOrder?: ByteLevelOrder) {
    radix = (typeof radix === 'number') ? radixValueToType(radix) : radix
    levelOrder = levelOrder || this.levelOrder
    const digitStr = this.toDigitString(radix)

    // format irrational
    const irrationalSuffix = (this.irrational ? IRR_SUFFIX_I : '')

    return [
      this.sign < 0 ? NEG_OP : '',
      showRadixPrefix ? `${RADIX_PREFIX}${radix || this.radix}` : '',
      levelOrder === this.levelOrder ? digitStr : [...digitStr].toReversed().join(''),
      irrationalSuffix
    ].join('')
  }

  private static toNumbers(a: number|PowerScalar, b?: number|PowerScalar) {
    const v = {
      a: typeof a === 'number' ? a : a.toNumber(),
      b: ((typeof b === 'number' || b === undefined) ? b : b.toNumber()) as number
    }

    const tr = {
      at: getRawScalarType(a),
      bt: (b !== undefined) && getRawScalarType(b) || undefined,
      ar: getRadix(a),
      br: (b !== undefined && getRadix(b)) || undefined
    }

    return {...v, ...tr}
  }

  /**
   * Perform an arithmetic operation. 
   * 
   * Output {@linkcode RadixType format} is determined by left operand. 
   * 
   * Currently implemented by converting to raw numbers before operating.
   * 
   * @param a 
   * @param b 
   */
  protected static eval(op: (a: number, b?: number) => number, a: number|PowerScalar, b?: number|PowerScalar): PowerScalar {
    const n = this.toNumbers(a, b)
    const c = op(n.a, n.b)
    
    if (n.at === RawScalarType.Number) {
      return new PowerScalar({ digits: c })
    }
    else {
      return parsePowerScalar(c.toString(radixTypeToValue(n.ar)), n.ar, undefined)
    }
  }

  /**
   * Add scalars. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static add(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    return this.eval((a,b) => a + b, a, b)
  }

  /**
   * Subtract scalars. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static subtract(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    return this.eval((a,b) => a - b, a, b)
  }

  /**
   * Multiply scalars. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static multiply(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    return this.eval((a,b) => a * b, a, b)
  }

  /**
   * Divide scalars. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static divide(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    return this.eval((a,b) => a / b, a, b)
  }

  /**
   * Raise a scalar to an exponent. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static pow(a: number|PowerScalar, b: number|PowerScalar): PowerScalar {
    return this.eval((a,b) => a ** b, a, b)
  }

  /**
   * Absolute value of a scalar. See {@linkcode PowerScalar.eval} for common implementation details.
   */
  static abs(a: number|PowerScalar) {
    return this.eval((a) => Math.abs(a), a)
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

export const byteReverseLevels = (b: number, r: number) => (
  Number.parseInt([...b.toString(r)].toReversed().join(''), r)
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

  let byte: number = 0
  let byteIdx: number = 0
  let digitIdx: number = 0
  let levelIdx: number
  for (let i = 0; i < digits.length; i++) {
    levelIdx = levelsPerByte - 1 - digitIdx
    const d: number = digits[i]

    if (d < valuesPerLevel) {
      // bit shift to current level in byte
      const l = d << levelIdx * bitsPerLevel

      // bitwise OR to set level within byte
      byte |= l

      // update offsets
      digitIdx++
      if (digitIdx >= levelsPerByte) {
        // write byte to bytes
        bytes.set([byte], byteIdx)

        // next byte
        byteIdx++
        digitIdx = 0
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
  if (byteIdx < bytes.length) {
    // write last byte to bytes
    bytes.set([byte], byteIdx)
  }

  return bytes
}

/**
 * @param rawStr Raw (formatted) fractional scalar number without radix.
 * @param levelOrder 
 * @returns Whole scalar formatted digits without radix, power, and sign.
 */
export function parseRawDigits(rawStr: string, levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT) {
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
 * @param irrational Whether least significant digit is infinitely repeating. 
 * Note this will be overridden as `false` if least significant digit is zero.
 */
export function parsePowerScalar(
  rawNum: number|string,
  radix: RadixType,
  irrational: boolean = false,
  levelOrder: ByteLevelOrder = ByteLevelOrder.DEFAULT
): PowerScalar|imaginary {
  let rawStr = (
    typeof rawNum === 'number' 
    // format using arbitrary radix >= maximum supported
    ? rawNum.toString(10) 
    : rawNum
  )
  const { rawDigits, power, sign } = parseRawDigits(rawStr, levelOrder)
  const leastDigitNonzero = (
    (
      levelOrder === ByteLevelOrder.HIGH_FIRST 
      ? rawStr.length-1-rawStr.lastIndexOf('0') 
      : rawStr.indexOf('0')
    ) !== 0
  )

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