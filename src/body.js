import React from 'react'
import * as reactRedux from 'react-redux'

import Line from './line'

function Body(props) {
  return (
    <tbody>
      {props.lineIds.map(lineId => <Line className='bomLine' key={lineId} lineId={lineId} />)}
    </tbody>
  )
}

function mapStateToProps(state) {
  return {
    lineIds: state.data.present.get('order')
  }
}

export default reactRedux.connect(mapStateToProps)(Body)
