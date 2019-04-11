import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as immutable from 'immutable'
import oneClickBom from '1-click-bom'

import {actions} from './state'
import {
  retailerSelectionNumbers,
  getInStockLines,
  getAllOffers,
  getPurchaseLines
} from './process_bom'

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
            {props.retailerNumbers.get(retailer) > 0 && (
              <span style={{color: '#2185D0'}}>
                {props.retailerNumbers.get(retailer) +
                  ` line${props.retailerNumbers.get(retailer) > 1 ? 's' : ''}`}
              </span>
            )}
          </div>
        </th>
      )
    })
    const search = (
      <span className="searchCellInner" onClick={() => props.searchAll()}>
        <semantic.Popup
          size="mini"
          inverted
          position="bottom left"
          verticalOffset={3}
          horizontalOffset={7}
          trigger={<semantic.Icon name="search" />}
          content="Search all descriptions"
        />
      </span>
    )
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

function getInStockPurchaseLines(state) {
  const offers = getAllOffers(state.suggestions)
  let lines = state.data.present.get('lines')
  const buyMultiplier = state.view.get('buyMultiplier')
  const alwaysBuySkus = state.view.get('alwaysBuySkus')
  lines = getInStockLines(lines, offers, buyMultiplier, alwaysBuySkus)
  const preferred = state.view.get('preferredRetailer')
  return getPurchaseLines(preferred, lines, alwaysBuySkus)
}

function getRetailerNumbers(state) {
  const lines = getInStockPurchaseLines(state)
  return retailerSelectionNumbers(lines)
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const partNumbersExpanded = state.view.get('partNumbersExpanded')
  const first = state.data.present.get('lines').first()
  return {
    retailerNumbers: state.view.get('previewBuy')
      ? getRetailerNumbers(state)
      : immutable.Map(),
    partNumbersExpanded,
    maxPartNumbers: first ? Math.max(first.get('partNumbers').size, 1) : 1
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Header)
