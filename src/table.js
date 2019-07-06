import React from 'react'
import ReactDOM from 'react-dom'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as immutable from 'immutable'
import * as semantic from 'semantic-ui-react'
import AutoSizer from 'react-virtualized-auto-sizer'
import {Grid, Input, Select} from 'react-spreadsheet-grid'
import ReactDataSheet from 'react-datasheet'

import {actions} from './state'

import './table.css'
import 'react-datasheet/lib/react-datasheet.css'

const SheetRenderer = props => {
  const {
    className,
    columns,
    selections,
    onSelectAllChanged,
  } = props
  return (
    <div className={className}>
      <div className="data-header">
        <div>
          <div className="action-cell cell">
            <input type="checkbox" checked={false} />
          </div>
          {columns.map(column => (
            <div
              className="cell"
              style={{width: column.width}}
              key={column.label}
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>
      <div className="data-body">{props.children}</div>
    </div>
  )
}

const RowRenderer = props => {
  const {
    className,
    row,
    selected,
    onSelectChanged,
  } = props
  return (
    <div className={className}>
      <div className="action-cell cell">
        <input type="checkbox" checked={selected} />
      </div>
      {props.children}
    </div>
  )
}

const CellRenderer = props => {
  const {
    cell,
    row,
    col,
    columns,
    attributesRenderer,
    selected,
    editing,
    updated,
    style,
    ...rest
  } = props

  const attributes = cell.attributes || {}
  // ignore default style handed to us by the component and roll our own
  attributes.style = {width: columns[col].width, overflow: 'hidden'}
  if (col === 0) {
    attributes.title = cell.label
  }

  return (
    <div {...rest} {...attributes}>
      {props.children}
    </div>
  )
}

class Table extends React.Component {
  sheetRenderer = props => {
    return (
      <SheetRenderer
        columns={this.props.columns}
        {...props}
      />
    )
  }

  rowRenderer = props => {
    return <RowRenderer className="data-row" {...props} />
  }

  cellRenderer = props => {
    return <CellRenderer columns={this.props.columns} {...props} />
  }
  render() {
    const props = this.props
    return (
      <ReactDataSheet
        data={this.props.lines.toArray()}
        sheetRenderer={this.sheetRenderer}
        rowRenderer={this.rowRenderer}
        cellRenderer={this.cellRenderer}
        valueRenderer={(cell, i, j) => cell.value}
        onCellsChanged={changes => {
          //const grid = this.state.grid.map(row => [...row])
          //changes.forEach(({cell, row, col, value}) => {
          //  grid[row][col] = {...grid[row][col], value}
          //})
          //this.setState({grid})
        }}
      />
    )
  }
}

function mapStateToProps(state) {
  const lines = state.data.present
    .get('lines')
    .map((line, id) => {
      return line.merge({id})
    })
    .map(line => {
      return [
        {value: line.get('reference')},
        {value: line.get('quantity')},
        {value: line.get('description')},
        {value: line.getIn(['partNumbers', 0, 'part'])},
        {value: line.getIn(['retailers', 'Digikey'])},
        {value: line.getIn(['retailers', 'Mouser'])},
        {value: line.getIn(['retailers', 'RS'])},
        {value: line.getIn(['retailers', 'Farnell'])},
      ]
    })
    .toList()
  return {
    lines,
    order: state.data.present.get('order'),
    columns: [
      {label: 'References', width: '20%'},
      {label: 'Qty', width: '5%'},
      {label: 'Description', width: '30%'},
      {label: 'Part Number', width: '20%'},
      {label: 'Digikey', width: '5%'},
      {label: 'Mouser', width: '5%'},
      {label: 'RS', width: '5%'},
      {label: 'Farnell', width: '5%'},
    ],
  }
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Table)
