import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as oneClickBom from '1-click-bom'
import * as immutable from 'immutable'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as reselect from 'reselect'

import selectors from './selectors'
import {actions} from './state'
import SimpleCell from './simple_cell'
import MpnCell from './mpn_cell'
import SkuCell from './sku_cell'
import Handle from './handle'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

//for passing shallow equality
const fields = immutable.Map({
  reference: immutable.List.of('reference'),
  quantity: immutable.List.of('quantity'),
  description: immutable.List.of('description'),
  partNumbers: immutable.Range(0, 100).map(i =>
    immutable.Map({
      part: immutable.List.of('partNumbers', i, 'part'),
      manufacturer: immutable.List.of('partNumbers', i, 'manufacturer')
    })
  ),
  retailers: immutable.Map(
    retailer_list.map(r => [r, immutable.List.of('retailers', r)])
  )
})

function Line(props) {
  const {partNumbersExpanded, partNumbers, editingLine, lineId} = props
  const partNumberCells = partNumbers.flatMap((mpn, i) => {
    const cells = []
    if (partNumbersExpanded.get(i)) {
      const get = immutable.List.of('partNumbers', i, 'manufacturer')
      //just in case we have more partNumbers than we prepared in fields
      const field = fields.getIn(get) || get
      cells.push(
        <MpnCell
          key={`manufacturer-${i}`}
          field={field}
          lineId={lineId}
          partNumberIndex={i}
        />
      )
    }
    const get = immutable.List.of('partNumbers', i, 'part')
    //just in case we have more partNumbers than we prepared in fields
    const field = fields.getIn(get) || get
    cells.push(
      <MpnCell
        key={`part-${i}`}
        field={field}
        lineId={lineId}
        expanded={partNumbersExpanded.get(i)}
        partNumberIndex={i}
      />
    )
    return cells
  })
  const retailerCells = retailer_list.map((name, i) => {
    const field = fields.getIn(['retailers', name])
    return <SkuCell key={name} field={field} lineId={lineId} />
  })
  return (
    <semantic.Table.Row className='bomLine' active={editingLine}>
      <Handle lineId={lineId} />
      <SimpleCell field={fields.get('reference')} lineId={lineId} />
      <SimpleCell field={fields.get('quantity')} lineId={lineId} />
      <SimpleCell field={fields.get('description')} lineId={lineId} />
      {partNumberCells}
      {retailerCells}
    </semantic.Table.Row>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function makeEditingLineSelector() {
  return reselect.createSelector(
    [editingSelector, selectors.lineId],
    (editing, lineId) => editing && editing.get(0) === lineId
  )
}

function mapStateToProps() {
  const line = selectors.makeLineSelector()
  const editingLine = makeEditingLineSelector()
  return reselect.createSelector(
    [line, selectors.view, editingLine],
    (line, viewState, editingLine) => {
      const partNumbers = line.get('partNumbers')
      const partNumbersExpanded = viewState.get('partNumbersExpanded')
      return {
        partNumbers,
        partNumbersExpanded,
        editingLine
      }
    }
  )
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Line)
