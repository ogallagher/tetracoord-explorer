/**
 * Tetracoord engine cli driver.
 */

import pino from "pino"
import { Level } from "pino"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { RadixType } from "./tetracoord/scalar/radix"
import { VectorType } from "./tetracoord/vector/const"
import { evalExpression, logger as cLogger, ExpressionValue } from "./tetracoord/calculator/expression"
import { parsePowerScalar, PowerScalar } from "./tetracoord/scalar"
import Tetracoordinate from "./tetracoord/vector/tetracoordinate"
import CartesianCoordinate from "./tetracoord/vector/cartesian"
import * as readline from 'node:readline/promises'

const logStream = pino.destination({
  dest: process.stdout.fd,
  sync: false,
})

const logger = pino(
  {
    name: 'tcoord-cli',
    level: 'warn'
  },
  logStream
)

enum OptKey {
  Expr = 'expression',
  ScalarRadix = 'scalar-format-radix',
  VectorFormat = 'vector-format-type',
  LogLevel = 'log-level',
  Help = 'help',
  Version = 'version',
  Quit = 'quit'
}

type Opts = {
  [OptKey.Expr]?: string
  [OptKey.ScalarRadix]?: RadixType
  [OptKey.VectorFormat]?: VectorType
  [OptKey.LogLevel]?: Level
  [OptKey.Quit]?: boolean
}

// TODO fix flushLoggers
async function flushLoggers() {  
  await Promise.all([logger, cLogger].map(l => {
    return new Promise((res) => l.flush(res))
  }))
  await new Promise((res) => logStream.flush(res))
}

/**
 * @param loggers Loggers to flush before writing to the console.
 * @param msg Value passed to `console.log`.
 */
async function consoleLog(msg: any) {
  await flushLoggers()
  console.log(msg)
}

/**
 * Prompt for new opts to enable program loop with same inputs as first iteration.
 */
async function getArgV() {
  await flushLoggers()

  const rl: readline.Interface = readline.createInterface({
    input: process.stdin,
    // output to stderr avoids interfering with pino logger default output to stdout
    output: process.stdout
  })

  const argv = await rl.question('[--help for available options]\n[opts]: ')
  
  rl.close()
  return argv
}

const optParser = (
  yargs()
  .usage(
    'Tetracoord CLI driver. Supported functions: expression calculator.'
  )
  .help(false)
  .option(OptKey.Help, {
    alias: 'h',
    type: 'boolean',
    default: false,
  })
  .option(OptKey.Expr, {
    alias: 'e',
    string: true,
    demandOption: false,
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
    default: undefined,
    description: 'logging level'
  })
  .option(OptKey.Quit, {
    alias: 'q',
    type: 'boolean',
    description: 'Quit program.'
  })
)
let optsPrev: Opts = {}

function getOpts(argv: string[]|string): Opts|undefined {
  let opts = optParser.parse(argv) as Opts

  Object.keys(optsPrev).forEach((key) => {
    if (opts[key] === undefined) {
      opts[key] = optsPrev[key]
    }
  })

  return opts
}

/**
 * Persist previous opts as new defaults.
 */
function setOptDefaults(opts: Opts) {
  [
    OptKey.LogLevel, 
    OptKey.ScalarRadix, OptKey.VectorFormat,
    OptKey.Quit
  ].forEach((key) => {
    if (opts[key] !== undefined) {
      optsPrev[key] = opts[key]
    }
  })
}

function formatValue(res: ExpressionValue, formatRadix?: RadixType, formatVector?: VectorType): string {
  if (res instanceof Tetracoordinate) {
    return (
      formatVector === VectorType.CCoord ? res.toCartesianCoord() : res
    ).toString(formatRadix)
  }
  else if (res instanceof CartesianCoordinate) {
    return (
      formatVector === VectorType.TCoord ? Tetracoordinate.fromCartesianCoord(res) : res
    ).toString(formatRadix)
  }
  else if (res instanceof PowerScalar) {
    return res.toString(formatRadix)
  }
  else if (typeof res === 'number' && formatRadix !== undefined) {
    return parsePowerScalar(res, RadixType.D).toString(formatRadix, false)
  }
  else {
    return res.toString()
  }
}

async function main(opts: Opts): Promise<Opts> {
  logger.level = opts[OptKey.LogLevel] || logger.level
  cLogger.level = opts[OptKey.LogLevel] || cLogger.level

  logger.debug('begin')
  logger.debug({ opts })

  if (opts[OptKey.Help]) {
    const help = await optParser.getHelp()
    await consoleLog(help)
    return opts
  }

  const expr = opts[OptKey.Expr]
  if (expr === undefined || expr.trim().length === 0) {
    await consoleLog('no expression provided to evaluate')
    return opts
  }

  const res = evalExpression(expr)
  logger.info(`raw result = ${res}`)

  const resStr = formatValue(res, opts[OptKey.ScalarRadix], opts[OptKey.VectorFormat])

  await consoleLog(`result = ${resStr}`)

  logger.debug('end')
  return opts
}

async function wrapper(argv?: string[]) {
  await new Promise((res) => {
    if (argv) {
      res(argv)
    }
    else {
      getArgV()
      .then(res)
    }
  })
  .then(getOpts)
  .then(main)
  .then(setOptDefaults)
  .then(() => {
    if (!optsPrev[OptKey.Quit]) {
      return wrapper()
    }
    else {
      logger.info('explicit quit')
    }
  })
}

try {
  wrapper(hideBin(process.argv))
}
catch (err) {
  flushLoggers()
  .then(() => {
    throw err
  })
}
