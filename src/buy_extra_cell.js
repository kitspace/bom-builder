import React from 'react'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as reselect from 'reselect'
import * as semantic from 'semantic-ui-react'

import EditableCell from './editable_cell'
import * as selectors from './selectors'
import {actions} from './state'

import './buy_extra_cell.css'

function BuyExtraCell(props) {
  const check = props.buyExtra ? <semantic.Icon name="check" /> : null
  return (
    <semantic.Table.Cell
      onClick={() => props.toggleBuyExtra(props.lineId)}
      style={{cursor: 'pointer'}}
      className="buyExtraCell"
    >
      <div style={{display: 'flex'}}>{check}</div>
    </semantic.Table.Cell>
  )
}
function mapStateToProps() {
  return reselect.createSelector(
    [selectors.buyExtra],
    buyExtra => ({
      buyExtra
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(
  BuyExtraCell
)
