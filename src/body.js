import './buy_parts.css'
import React from 'react'
import * as reactRedux from 'react-redux'
import {FixedSizeList} from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

import Line from './line'

class Row extends React.PureComponent {
  render() {
    const props = this.props
    const id = props.data.get(props.index)
    return <Line className="bomLine" key={id} lineId={id} style={props.style} />
  }
}

function Body(props) {
  return (
    <div style={{flex: '1 1 auto'}}>
      <AutoSizer>
        {({width, height}) => (
          <FixedSizeList
            className="tableBody"
            height={height}
            width={width}
            itemCount={props.lineIds.size}
            itemSize={29}
            itemData={props.lineIds}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  )
}

function mapStateToProps(state) {
  return {
    lineIds: state.data.present.get('order')
  }
}

export default reactRedux.connect(mapStateToProps)(Body)
