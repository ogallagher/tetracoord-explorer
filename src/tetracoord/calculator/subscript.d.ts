// expose officially hidden members of subscript parser
declare module "subscript/src/const.js" {
  export const
  PREC_STATEMENT = 5,
  PREC_SEQ = 10,
  PREC_ASSIGN = 20,
  PREC_LOR = 30,
  PREC_LAND = 40,
  PREC_OR = 50,
  PREC_XOR = 60,
  PREC_AND = 70,
  PREC_EQ = 80,
  PREC_COMP = 90,
  PREC_SHIFT = 100,
  PREC_ADD = 110,
  PREC_MULT = 120,
  PREC_EXP = 130,
  PREC_PREFIX = 140,
  PREC_POSTFIX = 150,
  PREC_ACCESS = 170,
  PREC_GROUP = 180,
  PREC_TOKEN = 200
}

declare module "subscript/src/stringify.js" {
  export function stringify(node: any): any
}