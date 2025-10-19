import { RadixType } from "./radix"

export const BITS_PER_BYTE: number = 8

export const B_VALUES_PER_LEVEL: number = 2
export const B_BITS_PER_LEVEL: number = 1
export const B_LEVELS_PER_BYTE: number = BITS_PER_BYTE / B_BITS_PER_LEVEL

/**
 * Denominator to convert an irrational trailing {@linkcode RadixType.B binary} digit to a float number.
 */
export const B_IRR_DENOMINATOR = 1