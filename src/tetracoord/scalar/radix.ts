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
      throw new Error(`invalid radix type ${r}`)
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
      throw new Error(`invalid radix type ${r}`)
  }
}