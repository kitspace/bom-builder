import './buy_parts.css'
import React from 'react'
import ReactDOM from 'react-dom'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import ReactDataGrid from 'react-data-grid'
import * as immutable from 'immutable'
import AutoSizer from 'react-virtualized-auto-sizer'
import {Grid, Input, Select} from 'react-spreadsheet-grid'

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
    title: () => 'References',
    value: (row, {focus}) => {
      return <Input value={row.get('reference')} focus={focus} />
    }
  },
  {
    title: () => 'Qty',
    value: (row, {focus}) => {
      return <Input value={row.get('quantity')} focus={focus} />
    }
  },
  {
    title: () => 'Description',
    value: (row, {focus}) => {
      return <Input value={row.get('description')} focus={focus} />
    }
  },
  {
    title: () => 'Description',
    value: (row, {focus}) => {
      return <Input value={row.get('description')} focus={focus} />
    }
  },
  {
    title: () => 'Part Number',
    value: (row, {focus}) => {
      const mpn = row.getIn(['partNumbers', 0])
      return (
        <div>
          <Input value={mpn.get('manufacturer')} />
          <Input value={mpn.get('part')} focus={focus} />
        </div>
      )
    }
  },
  {
    title: () => 'Digikey',
    value: (row, {focus}) => {
      return <Input value={row.getIn(['retailers', 'Digikey'])} focus={focus} />
    }
  },
  {
    title: () => 'Mouser',
    value: (row, {focus}) => {
      return <Input value={row.getIn(['retailers', 'Mouser'])} focus={focus} />
    }
  },
  {
    title: () => 'RS',
    value: (row, {focus}) => {
      return <Input value={row.getIn(['retailers', 'RS'])} focus={focus} />
    }
  },
  {
    title: () => 'Farnell',
    value: (row, {focus}) => {
      return <Input value={row.getIn(['retailers', 'Farnell'])} focus={focus} />
    }
  }
]

class Table extends React.Component {
  onGridRowsUpdated = ({fromRow, toRow, updated}) => {
    for (let row = fromRow; row <= toRow; row++) {
      const line = this.props.lines.get(row)
      const lineId = line.get('id')
      Object.keys(updated).forEach(k => {
        const field = immutable.List(k.split(':'))
        const value = updated[k]
        this.props.setField({lineId, field, value})
      })
    }
  }
  render() {
    const props = this.props
    return (
      <Grid
        focusOnSingleClick={true}
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
