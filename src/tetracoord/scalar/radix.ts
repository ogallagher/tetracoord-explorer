import { B_IRR_DENOMINATOR } from "./binary"
import { D_IRR_DENOMINATOR } from "./decimal"
import { Q_IRR_DENOMINATOR } from "./quaternary"

export enum RadixType {
  /**
   * Radix type label for binary (base-2).
   */
  B = 'b',
  /**
   * Radix type label for quaternary (base-4).
   */
  Q = 'q',
  /**
   * Radix type label for decimal (base-10).
   */
  D = 'd'
}

export function radixTypeToValue(r: RadixType) {
  switch (r) {
    case RadixType.B:
      return 2
    case RadixType.Q:
      return 4
    case RadixType.D:
      return 10
    default:
      throw new Error(`invalid radix ${r}`)
  }
}

export function radixValueToType(r: number) {
  switch (r) {
    case 2:
      return RadixType.B
    case 4:
      return RadixType.Q
    case 10:
      return RadixType.D
    default:
      throw new Error(`invalid radix ${r}`)
  }
}

/**
 * @param r Radix
 * @returns Denominator to convert irrational trailing digit to a float number.
 */
export function radixToIrrDen(r: RadixType) {
  switch (r) {
    case RadixType.B:
      return B_IRR_DENOMINATOR
    case RadixType.Q:
      return Q_IRR_DENOMINATOR
    case RadixType.D:
      return D_IRR_DENOMINATOR
    default:
      throw new Error(`invalid radix ${r}`)
  }
}