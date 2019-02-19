import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import oneClickBom from '1-click-bom'

import {actions} from './state'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

class Header extends React.Component {
  render() {
    const props = this.props
    const {
      partNumbersExpanded,
      maxPartNumbers,
      sortBy,
      togglePartNumbersExpanded
    } = props
    const cells = []
    for (let i = 0; i < maxPartNumbers; ++i) {
      if (partNumbersExpanded.get(i)) {
        cells.push(
          <th style={{minWidth: 160}} key={`Manufacturer${i}`}>
            <div className="headerWithButton">
              <span
                style={{cursor: 'pointer'}}
                onClick={() => sortBy(['manufacturer', i])}
              >
                Manufacturer
              </span>
            </div>
          </th>
        )
      }
      cells.push(
        <PartNumberHeader
          isExpanded={partNumbersExpanded.get(i)}
          toggleExpanded={() => togglePartNumbersExpanded(i)}
          sortByThis={() => sortBy(['part', i])}
          key={`MPN${i}`}
          shorten={maxPartNumbers > 1 && i === maxPartNumbers - 1}
        />
      )
    }
    const headers = retailer_list.map((retailer, i) => {
      return (
        <th key={retailer}>
          <div className="headerWithButton">
            <span style={{cursor: 'pointer'}} onClick={() => sortBy(retailer)}>
              {retailer}
            </span>
          </div>
        </th>
      )
    })
    let search
    if (props.searchStatus !== 'done') {
      search = (
        <span className="searchCellInner" onClick={() => props.searchAll()}>
          {props.searchStatus === 'searching' ? (
            <semantic.Loader active inline size="mini" />
          ) : (
            <semantic.Icon name="search" />
          )}
        </span>
      )
    }
    return (
      <thead>
        <tr>
          <th colSpan={2}>
            <span
              style={{cursor: 'pointer'}}
              onClick={() => sortBy('reference')}
            >
              References
            </span>
          </th>
          <th>
            <span
              style={{cursor: 'pointer'}}
              onClick={() => sortBy('quantity')}
            >
              Quantity
            </span>
          </th>
          <th colSpan={2}>
            <div style={{minWidth: 88}}>
              <span
                style={{cursor: 'pointer'}}
                onClick={() => sortBy('description')}
              >
                Description
              </span>
              {search}
            </div>
          </th>
          {cells}
          {headers}
        </tr>
      </thead>
    )
  }
}

function PartNumberHeader({sortByThis, isExpanded, toggleExpanded, shorten}) {
  const text = shorten ? '...' : 'Part Number'
  return (
    <th style={{minWidth: shorten ? 0 : 130}}>
      <div className="headerWithButton">
        {(() => {
          if (!isExpanded) {
            return (
              <semantic.Label
                basic
                onClick={toggleExpanded}
                className="expandLabel"
              >
                <semantic.Icon name="angle double left" />
                <semantic.Icon name="angle double right" />
              </semantic.Label>
            )
          } else {
            return (
              <semantic.Label
                basic
                onClick={toggleExpanded}
                className="expandLabel"
                style={{
                  marginLeft: -19
                }}
              >
                <semantic.Icon name="angle double right" />
                <semantic.Icon name="angle double left" />
              </semantic.Label>
            )
          }
        })()}
        <span style={{cursor: 'pointer'}} onClick={sortByThis}>
          {text}
        </span>
      </div>
    </th>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const partNumbersExpanded = state.view.get('partNumbersExpanded')
  const first = state.data.present.get('lines').first()
  const searching = state.suggestions.reduce(
    (prev, s) =>
      prev || s.get('search') === 'searching' || s.get('search') === 'start',
    false
  )
  const done = state.suggestions.reduce(
    (prev, s) => prev && s.get('search') === 'done',
    true
  )
  const searchStatus = searching ? 'searching' : done ? 'done' : null
  return {
    partNumbersExpanded,
    searchStatus,
    maxPartNumbers: first ? Math.max(first.get('partNumbers').size, 1) : 1
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Header)
