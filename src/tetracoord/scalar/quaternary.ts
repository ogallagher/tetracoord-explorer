import { BITS_PER_BYTE } from "./binary"
import { RadixType } from "./radix"

export const Q_VALUES_PER_LEVEL: number = 4
export const Q_BITS_PER_LEVEL: number = 2
export const Q_LEVELS_PER_BYTE: number = BITS_PER_BYTE / Q_BITS_PER_LEVEL

/**
 * Denominator to convert an irrational trailing {@linkcode RadixType.Q quaternary} digit to a float number.
 */
export const Q_IRR_DENOMINATOR = 3