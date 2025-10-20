import React from "react"
import { Tetracoordinate } from "tetracoord/src/tetracoord/vector"
import { RadixType } from "tetracoord/src/tetracoord/scalar"

interface TetracoordDisplayProps {
  tcoord: Tetracoordinate
}

function TetracoordDisplay(props: TetracoordDisplayProps) {
  let [tcoordDigits, setTcoordDigits] = React.useState('')
  let [tcoordComponents, setTcoordComponents] = React.useState('')

  React.useEffect(() => {
    console.log(props.tcoord.toString())
    setTcoordDigits(props.tcoord.value.toString(RadixType.Q, false))

    let ccoord = props.tcoord.toCartesianCoord()
    let cx = Math.round(ccoord.v.x * 100000) / 100000
    let cy = Math.round(ccoord.v.y * 100000) / 100000
    setTcoordComponents(`${cx} , ${cy}`)
  }, [props.tcoord])

  return (
    <div className="d-flex flex-row justify-content-center">
      <div className="w-50">
        <div className="row">
          <span className="col">tetracoordinate</span>
          <span className="col">{tcoordDigits}</span>
        </div>
        <div className="row">
          <span className="col">cartesian</span>
          <span className="col">{tcoordComponents}</span>
        </div>
      </div>
    </div>
  )
}

export default TetracoordDisplay
