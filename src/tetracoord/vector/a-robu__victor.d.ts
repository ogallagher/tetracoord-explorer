/**
 * // TODO declare remaining members. See http://victorjs.org/#documentation
 */

declare module '@a-robu/victor'

declare class Victor {
    // variables

    x: number
    y: number

    // methods

    constructor(x: number, y: number)
    
    horizontalAngle(): number
    rotate(angle: number): Victor
    rotateTo(angle: number): Victor
}

module.exports = {
    default: Victor
}
