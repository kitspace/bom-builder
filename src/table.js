import './buy_parts.css'
import React from 'react'
import * as reactRedux from 'react-redux'
import ReactDataGrid from 'react-data-grid'
import * as immutable from 'immutable'
import AutoSizer from 'react-virtualized-auto-sizer'

import Line from './line'
import {emptyLine} from './state'

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
    formatter: ({value}) => {
      return (
        <>
          <div>{value.get('manufacturer')}</div>
          <div>{value.get('part')}</div>
        </>
      )
    }
  },
  {
    key: 'partNumber1',
    name: 'Part Numbers (2)',
    formatter: ({value}) => {
      return (
        <>
          <div>{value.get('manufacturer')}</div>
          <div>{value.get('part')}</div>
        </>
      )
    }
  },
  {key: 'Digikey', name: 'Digikey'},
  {key: 'Mouser', name: 'Mouser'},
  {key: 'RS', name: 'RS'},
  {key: 'Farnell', name: 'Farnell'}
].map(c => ({...c, editable: true}))

function rowGetter(key) {}

const onGridRowsUpdated = ({fromRow, toRow, updated}) => {
  console.log({fromRow, toRow, updated})
}

function Table(props) {
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
            onGridRowsUpdated={onGridRowsUpdated}
            rowSelection={{showCheckbox: true}}
            cellNavigationMode="changeRow"
          />
        )}
      </AutoSizer>
    </div>
  )
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

export default reactRedux.connect(mapStateToProps)(Table)
