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
    as: Tag,
    headerAs: Header,
    bodyAs: Body,
    rowAs: Row,
    cellAs: Cell,
    className,
    columns,
    selections,
    onSelectAllChanged,
  } = props
  return (
    <Tag className={className}>
      <Header className="data-header">
        <Row>
          <Cell className="action-cell cell">
            <input type="checkbox" checked={false} />
          </Cell>
          {columns.map(column => (
            <Cell
              className="cell"
              style={{width: column.width}}
              key={column.label}
            >
              {column.label}
            </Cell>
          ))}
        </Row>
      </Header>
      <Body className="data-body">{props.children}</Body>
    </Tag>
  )
}

const RowRenderer = props => {
  const {
    as: Tag,
    cellAs: Cell,
    className,
    row,
    selected,
    onSelectChanged,
  } = props
  return (
    <Tag className={className}>
      <Cell className="action-cell cell">
        <input type="checkbox" checked={selected} />
      </Cell>
      {props.children}
    </Tag>
  )
}

const CellRenderer = props => {
  const {
    as: Tag,
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
  attributes.style = {width: (columns[col] || {}).width, overflow: 'hidden'}
  if (col === 0) {
    attributes.title = cell.label
  }

  return (
    <Tag {...rest} {...attributes}>
      {props.children}
    </Tag>
  )
}

class Table extends React.Component {
  sheetRenderer = props => {
    return (
      <SheetRenderer
        as="div"
        headerAs="div"
        bodyAs="div"
        rowAs="div"
        cellAs="div"
        columns={this.props.columns}
        {...props}
      />
    )
  }

  rowRenderer = props => {
    return <RowRenderer as="div" cellAs="div" className="data-row" {...props} />
  }

  cellRenderer = props => {
    return <CellRenderer as="div" columns={this.props.columns} {...props} />
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
