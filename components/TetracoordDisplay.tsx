import React from "react"
import { Tetracoordinate } from "../src/tetracoords"

interface TetracoordDisplayProps {
    tcoord: Tetracoordinate
}

function TetracoordDisplay(props: TetracoordDisplayProps) {
    let [tcoord_bytes, set_tcoord_bytes] = React.useState('')
    let [tcoord_cmps, set_tcoord_cmps] = React.useState('')

    React.useEffect(() => {
        console.log(props.tcoord.toString())
        set_tcoord_bytes(props.tcoord.get_quad_strs().join(''))

        let ccoord = props.tcoord.to_cartesian_coord()
        let cx = Math.round(ccoord.x * 100000) / 100000
        let cy = Math.round(ccoord.y * 100000) / 100000
        set_tcoord_cmps(`${cx} , ${cy}`)
    }, [props.tcoord])

    return (
        <div className="d-flex flex-row justify-content-center">
            <div className="w-50">
                <div className="row">
                    <span className="col">tetracoordinate</span>
                    <span className="col">{tcoord_bytes}</span>
                </div>
                <div className="row">
                    <span className="col">cartesian</span>
                    <span className="col">{tcoord_cmps}</span>
                </div>
            </div>
        </div>
    )
}

export default TetracoordDisplay
