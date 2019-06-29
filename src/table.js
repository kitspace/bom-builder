import './buy_parts.css'
import React from 'react'
import ReactDOM from 'react-dom'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import ReactDataGrid from 'react-data-grid'
import * as immutable from 'immutable'
import AutoSizer from 'react-virtualized-auto-sizer'

import {actions} from './state'

function mpnFormatter({value}) {
  value = value || immutable.Map()
  return (
    <>
      <div>{value.get('manufacturer')}</div>
      <div>{value.get('part')}</div>
    </>
  )
}

class MpnEditor extends React.Component {
  constructor(props) {
    super(props)
    this.state = {mpn: props.value}
  }
  getValue() {
    // an object of key/value pairs to be merged back to the row
    return {[this.props.column.key]: this.state.mpn || this.props.value}
  }

  getInputNode() {
    return ReactDOM.findDOMNode(this).getElementsByClassName('partInput')[0]
  }
  disableContainerStyles() {
    return true
  }

  handlePartChange = event => {
    const value = event.target.value
    this.setState(state => {
      return {mpn: state.mpn.set('part', value)}
    })
  }

  handleManufacturerChange = event => {
    const value = event.target.value
    this.setState(state => {
      return {mpn: state.mpn.set('manufacturer', value)}
    })
  }

  render() {
    const mpn = this.state.mpn || this.props.value
    return (
      <div style={{background: 'white'}}>
        <input
          onChange={this.handleManufacturerChange}
          value={mpn.get('manufacturer')}
        />
        <input
          className="partInput"
          onChange={this.handlePartChange}
          value={mpn.get('part')}
        />
      </div>
    )
  }
}

const columns = [
  {
    key: 'reference',
    name: 'References'
  },
  {key: 'quantity', name: 'Qty', width: 60},
  {key: 'description', name: 'Description', width: 300},
  {
    editable: true,
    key: 'partNumbers:0',
    name: 'Part Number',
    editor: MpnEditor,
    formatter: mpnFormatter
  },
  {
    key: 'partNumbers:1',
    name: 'Part Number (2)',
    editor: MpnEditor,
    formatter: mpnFormatter
  },
  {key: 'retailers:Digikey', name: 'Digikey'},
  {key: 'retailers:Mouser', name: 'Mouser'},
  {key: 'retailers:RS', name: 'RS'},
  {key: 'retailers:Farnell', name: 'Farnell'}
].map(c => ({...c, editable: true}))

class Table extends React.Component {
  onGridRowsUpdated = ({fromRow, toRow, updated}) => {
    const line = this.props.lines.get(toRow)
    const lineId = line.get('id')
    Object.keys(updated).forEach(k => {
      const field = immutable.List(k.split(':'))
      const value = updated[k]
      this.props.setField({lineId, field, value})
    })
  }
  render() {
    const props = this.props
    return (
      <div style={{flex: '1 1 auto'}}>
        <AutoSizer disableWidth>
          {({height}) => (
            <ReactDataGrid
              columns={columns}
              rowGetter={i => props.lines.get(i)}
              rowsCount={props.lines.size}
              minHeight={height}
              enableCellSelect={true}
              onGridRowsUpdated={this.onGridRowsUpdated}
              rowSelection={{showCheckbox: true}}
              cellNavigationMode="changeRow"
            />
          )}
        </AutoSizer>
      </div>
    )
  }
}

function mapStateToProps(state) {
  const lines = state.data.present
    .get('lines')
    .map((line, id) => {
      const partNumbers = immutable.Map(
        line.get('partNumbers').map((m, i) => [`partNumbers:${i}`, m])
      )
      const retailers = line
        .get('retailers')
        .mapEntries(([k, v]) => ['retailers:' + k, v])
      return line
        .merge(retailers)
        .merge(partNumbers)
        .merge({id})
    })
    .toList()
  return {
    lines,
    order: state.data.present.get('order')
  }
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Table)
