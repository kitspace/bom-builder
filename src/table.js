import React from 'react'
import ReactDOM from 'react-dom'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as immutable from 'immutable'
import * as semantic from 'semantic-ui-react'
import AutoSizer from 'react-virtualized-auto-sizer'
import {Grid, Input, Select} from 'react-spreadsheet-grid'

import {actions} from './state'

import './table.css'

const retailerRender = retailer => (row, {active, focus}) => {
  const value = row.getIn(['retailers', retailer])
  if (active) {
    return <Input value={value} focus={focus} />
  }
  if (value) {
    return <semantic.Icon name="check" color="green" />
  }
  return <div />
}

class Table extends React.Component {
  state = {
    columnWidths: {
      quantity: 7,
      'retailers:Digikey': 7,
      'retailers:Mouser': 7,
      'retailers:RS': 7,
      'retailers:Farnell': 7,
    },
  }
  render() {
    const columns = [
      {
        id: 'reference',
        title: 'References',
        value: (row, {focus}) => {
          return <Input value={row.get('reference')} focus={focus} />
        },
      },
      {
        id: 'quantity',
        title: 'Qty',
        value: (row, {focus}) => {
          return <Input value={row.get('quantity')} focus={focus} />
        },
      },
      {
        id: 'description',
        title: 'Description',
        value: (row, {focus}) => {
          return <Input value={row.get('description')} focus={focus} />
        },
      },
      {
        id: 'partNumbers:0',
        title: 'Part Number',
        value: (row, {focus}) => {
          const mpn = row.getIn(['partNumbers', 0])
          return (
            <div>
              <input
                className="manufacturerInput"
                value={mpn.get('manufacturer')}
              />
              <Input value={mpn.get('part')} focus={focus} />
            </div>
          )
        },
      },
      {
        id: 'retailers:Digikey',
        title: 'Digikey',
        value: retailerRender('Digikey'),
      },
      {
        id: 'retailers:Mouser',
        title: 'Mouser',
        value: retailerRender('Mouser'),
      },
      {
        id: 'retailers:RS',
        title: 'RS',
        value: retailerRender('RS'),
      },
      {
        id: 'retailers:Farnell',
        title: 'Farnell',
        value: retailerRender('Mouser'),
      },
    ]
    const props = this.props
    return (
      <Grid
        onActiveChanged={({column: newColumn}, {column: prevColumn}) => {
          console.log({newColumn, prevColumn})
          if (/^retailers:/.test(prevColumn)) {
            this.setState(state => ({
              columnWidths: {...state.columnWidths, [prevColumn]: 7},
            }))
          }
          if (/^retailers:/.test(newColumn)) {
            this.setState(state => ({
              columnWidths: {...state.columnWidths, [newColumn]: 20},
            }))
          }
        }}
        isColumnsResizable={true}
        columnWidthValues={this.state.columnWidths}
        focusOnSingleClick={false}
        columns={columns}
        rows={this.props.lines.toArray()}
        getRowKey={i => props.lines.getIn([i, 'id'])}
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
    .toList()
  return {
    lines,
    order: state.data.present.get('order'),
  }
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Table)
