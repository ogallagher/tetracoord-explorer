/**
 * Expression parser that extends {@link https://npmjs.org/package/subscript subscript}.
 */

// enable subset of default subscript syntax
import "subscript/feature/number.js"
import "subscript/feature/string.js"
import "subscript/feature/call.js"
import "subscript/feature/access.js"
import "subscript/feature/group.js"
import "subscript/feature/assign.js"
import "subscript/feature/mult.js"
import "subscript/feature/add.js"
import "subscript/feature/increment.js"
// import "subscript/feature/bitwise.js"
import "subscript/feature/logic.js"
import "subscript/feature/compare.js"
import "subscript/feature/shift.js"
import compile from "subscript/src/compile.js"
// export subset
export { parse, access, binary, unary, nary, group, token } from "subscript/src/parse.js"
export { compile, operator } from "subscript/src/compile.js"
export { stringify } from "subscript/src/stringify.js"

// add new syntax
import { nary, unary, group, err, token } from "subscript/src/parse.js";
import { operator } from "subscript/src/compile.js"
import { PREC_ACCESS, PREC_GROUP, PREC_TOKEN } from "subscript/src/const.js";
import { TRIG_COS_PI_OVER_6, TRIG_SIN_PI_OVER_6 } from "../vector/cartesian";
import { RADIX_PREFIX_OP, IRR_SUFFIX_OP, ABS_GROUP_OP, COSPI6_CONST, SINPI6_CONST } from "./symbol";

// parser handle exponent from justin
import "subscript/feature/pow.js"
// parser handle literal number radix prefix as <radix> @ <raw-fractional-value>
nary(RADIX_PREFIX_OP, PREC_ACCESS)
// parser handle literal number irrational suffix as <raw-fractional-value> ~
unary(IRR_SUFFIX_OP, PREC_ACCESS + 1, true)
// parser handle absolute value, magnitude
group(ABS_GROUP_OP, PREC_GROUP)
operator(ABS_GROUP_OP, (a, b) => b === undefined && (!a && err(`Empty ${ABS_GROUP_OP}`), compile(a)))
// parser handle trig constant
token(COSPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_COS_PI_OVER_6])
token(SINPI6_CONST, PREC_TOKEN, a => a ? err() : [, TRIG_SIN_PI_OVER_6])
