/**
 * Tetracoord engine cli driver.
 */

import pino from "pino"
import { Level } from "pino"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RadixType } from "./tetracoord/scalar/radix"
import { VectorType } from "./tetracoord/vector/const"
import { evalExpression, logger as cLogger } from "./tetracoord/calculator/expression"

const logger = pino({
  name: 'tcoord-cli',
  level: 'debug'
})

enum OptKey {
  Expr = 'expression',
  ScalarRadix = 'scalar-format-radix',
  VectorFormat = 'vector-format-type',
  LogLevel = 'log-level',
  Help = 'help',
  Version = 'version'
}

type Opts = {
  [OptKey.Expr]: string
  [OptKey.ScalarRadix]: RadixType|undefined
  [OptKey.VectorFormat]: VectorType|undefined
  [OptKey.LogLevel]: Level
}

function getOpts(argv: string[]): Opts {
  const parser = (
    yargs(argv)
    .usage(
      'Tetracoord CLI driver. Supported functions: expression calculator.'
    )
    .help(OptKey.Help)
    .alias(OptKey.Help, 'h')
    .option(OptKey.Expr, {
      alias: 'e',
      string: true,
      demandOption: true,
      description: (
        'Calculator input expression to evaluate.'
      )
    })
    .option(OptKey.ScalarRadix, {
      alias: 's',
      choices: [RadixType.D, RadixType.B, RadixType.Q],
      default: undefined,
      description: (
        'Output format (radix) for scalar values: [d]ecimal, [q]uaternary, [b]inary. '
        + 'Alternative is to convert within the expression; ex. "0d1 * 0q32" will '
        + 'convert to the radix of the left operand (decimal).'
      )
    })
    .option(OptKey.VectorFormat, {
      alias: 'v',
      choices: [VectorType.CCoord, VectorType.TCoord],
      default: undefined,
      description: (
        'Output format for vector values: cartesian or tetracoord. '
        + 'Alternative is to convert within the expression; ex. "cc[tc[]]"'
      )
    })
    .option(OptKey.LogLevel, {
      alias: 'l',
      choices: ["fatal", "error", "warn", "info", "debug", "trace"],
      default: 'warn',
      description: 'logging level'
    })
  )

  return parser.parse() as Opts
}

function main(opts: Opts) {
  logger.level = opts[OptKey.LogLevel]
  cLogger.level = opts[OptKey.LogLevel]

  logger.debug('begin')
  logger.debug(opts)

  const res = evalExpression(opts[OptKey.Expr], opts[OptKey.ScalarRadix], opts[OptKey.VectorFormat])
  logger.info(res)

  logger.flush()
  cLogger.flush()
  console.log(`result = ${res.toString()}`)

  logger.debug('end')
}

try {
  main(getOpts(hideBin(process.argv)))
}
catch (err) {
  logger.flush()
  throw err
}
