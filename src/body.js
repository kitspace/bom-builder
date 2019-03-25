import './buy_parts.css'
import React from 'react'
import * as reactRedux from 'react-redux'

import Line from './line'

function Body(props) {
  return (
    <div style={{flex: '1 1 auto'}}>
      {props.lineIds.map(id => (
        <Line className="bomLine" key={id} lineId={id} style={props.style} />
      ))}
    </div>
  )
}

function mapStateToProps(state) {
  return {
    lineIds: state.data.present.get('order')
  }
}

export default reactRedux.connect(mapStateToProps)(Body)
