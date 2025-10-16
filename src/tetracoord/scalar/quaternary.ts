import { BITS_PER_BYTE } from "./binary"

export const Q_VALUES_PER_LEVEL: number = 4
export const Q_BITS_PER_LEVEL: number = 2
export const Q_LEVELS_PER_BYTE: number = BITS_PER_BYTE / Q_BITS_PER_LEVEL