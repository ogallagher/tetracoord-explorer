export enum ByteLevelOrder {
    HIGH_FIRST = 'h',
    LOW_FIRST = 'l',

    DEFAULT = HIGH_FIRST
}

export type imaginary = null
export const Imaginary: imaginary = null

/**
 * Max number of bytes that can be implicitly converted to an int (unsigned with final unsigned right shift operation) 
 * for bitwise operations, then implicitly converted back to number.
 */
export const INT_MAX_BYTES: number = 4
