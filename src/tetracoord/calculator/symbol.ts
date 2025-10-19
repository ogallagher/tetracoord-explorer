import { RadixType } from "../scalar/radix"
import { VectorType } from "../vector/const"

/**
 * Prefix to the {@linkcode RadixType radix label} in a scalar literal.
 */
export const RADIX_PREFIX = '0'
/**
 * Operator corresponding to {@linkcode RADIX_PREFIX} in intermediate/parser syntax.
 */
export const RADIX_PREFIX_OP = '@'
/**
 * Default irrational suffix in a scalar literal.
 */
export const IRR_SUFFIX_I = 'i'
/**
 * Alternative irrational suffix in a scalar literal.
 */
export const IRR_SUFFIX_DOTS = '...'
/**
 * Operator corresponding to {@linkcode IRR_SUFFIX_I} in intermediate syntax.
 */
export const IRR_SUFFIX_OP = '~'
/**
 * Delimiter between the whole/integer digits and fractional digits (decimal point) in a scalar literal.
 */
export const WHOL_FRAC_DELIM = '.'
/**
 * Vector access operator, following the {@linkcode VectorType} label.
 */
export const VEC_ACCESS_OP = '[]'
/**
 * Delimiter for items in a collection (ex. components in a cartesian coordinate).
 */
export const ITEM_DELIM_OP = ','
/**
 * Negative/subtract operator.
 */
export const NEG_OP = '-'
/**
 * Positive/add operator.
 */
export const POS_OP = '+'
/**
 * Multiply operator.
 */
export const MUL_OP = '*'
/**
 * Divide operator.
 */
export const DIV_OP = '/'
/**
 * Exponent operator.
 */
export const EXP_OP = '**'
/**
 * Scalar absolute value and vector magnitude group operator.
 */
export const ABS_GROUP_OP = '||'
/**
 * Parenthesis group operator.
 */
export const GROUP_OP = '()'
/**
 * Strict (same type) equal operator.
 */
export const EQ_STRICT_OP = '==='
/**
 * Strict (same type) not equal operator.
 */
export const NEQ_STRICT_OP = '!=='
export const EQ_LOOSE_OP = '=='
export const NEQ_LOOSE_OP = '!='

export const COSPI6_CONST = 'cospi6'
export const SINPI6_CONST = 'sinpi6'
