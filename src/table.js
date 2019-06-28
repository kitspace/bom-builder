import './buy_parts.css'
import React from 'react'
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

const columns = [
  {
    key: 'reference',
    name: 'References'
  },
  {key: 'quantity', name: 'Qty', width: 60},
  {key: 'description', name: 'Description', width: 300},
  {
    editable: true,
    key: 'partNumber0',
    name: 'Part Numbers',
    formatter: mpnFormatter
  },
  {
    key: 'partNumber1',
    name: 'Part Numbers (2)',
    formatter: mpnFormatter
  },
  {key: 'Digikey', name: 'Digikey'},
  {key: 'Mouser', name: 'Mouser'},
  {key: 'RS', name: 'RS'},
  {key: 'Farnell', name: 'Farnell'}
].map(c => ({...c, editable: true}))

class Table extends React.Component {
  onGridRowsUpdated = ({fromRow, toRow, updated}) => {
    const line = this.props.lines.get(toRow)
    const lineId = line.get('id')
    console.log({fromRow, toRow, updated})
    Object.keys(updated).forEach(k => {
      this.props.setField({
        lineId,
        field: immutable.List.of(k),
        value: updated[k]
      })
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
        line.get('partNumbers').map((m, i) => [`partNumber${i}`, m])
      )
      const retailers = line.get('retailers')
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
