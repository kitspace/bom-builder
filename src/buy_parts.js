import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import immutable from 'immutable'
import oneClickBom from '1-click-bom'

import {actions} from './state'
import {priorityOfRetailers, reduceBom, retailerSelectionNumbers} from './bom'

const retailer_list = oneClickBom
  .getRetailers()
  .filter(r => r !== 'Rapid' && r !== 'Newark')

function BuyParts(props) {
  const retailers = props.selectionNumbers
    .sort((a, b) => b - a)
    .map((v, r) => {
      if (v > 0) {
        return (
          <semantic.List.Item key={r}>
            <semantic.List.Header>{r}</semantic.List.Header>
            {v}
          </semantic.List.Item>
        )
      }
    })
    .valueSeq()
    .toJS()
  return (
    <tr style={{height: 40}}>
      <th colSpan={4} />
      <th colSpan={props.partNumberColumns || 1} />
      <th colSpan="100%">
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div>
            <semantic.Button
              onClick={props.autoFillSuggestions}
              className="buyPartsButton"
              color="green"
              basic
            >
              <semantic.Icon name="magic" />
              Auto Fill
            </semantic.Button>
          </div>
          <div>
            <semantic.Button
              disabled={!props.extensionPresent}
              className="buyPartsButton"
              color={props.extensionPresent ? 'blue' : 'grey'}
              onClick={() => props.setAddingParts('start')}
              basic
            >
              <semantic.Icon name="shopping basket" />
              <semantic.Icon name="plus" />
              Buy Parts
            </semantic.Button>
          </div>
          {props.extensionPresent ? (
            <div
              style={{
                fontWeight: 'normal',
                height: '100%',
                verticalAlign: 'middle',
                color: '#2185D0',
                minWidth: 160
              }}
            >
              Preffered retailer:{'  '}
              <semantic.Dropdown
                inline
                value={props.preferredRetailer}
                options={retailer_list.map(r => ({key: r, text: r, value: r}))}
                onChange={(e, {value}) => props.setPreferredRetailer(value)}
              />{' '}
            </div>
          ) : (
            <div style={{color: 'lightgrey'}}>
              Install the 1-click BOM exension to use this feature
            </div>
          )}
          <semantic.List>{retailers}</semantic.List>
          <pre>{JSON.stringify(props.selectionNumbers, null, 2)}</pre>
        </div>
      </th>
    </tr>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const extensionPresent = state.view.get('extensionPresent')
  const preferred = state.view.get('preferredRetailer')
  let lines = state.data.present.get('lines')
  const loading = state.suggestions.reduce(
    (prev, s) => prev || s.get('status') === 'loading',
    false
  )
  let selectionNumbers = immutable.Map()
  if (!loading) {
    const offers = state.suggestions
      .map(x => x.get('data'))
      .reduce((offers, suggestions) => {
        suggestions = suggestions || immutable.List()
        return suggestions.reduce(
          (offers, part) =>
            part
              .get('offers')
              .reduce(
                (offers, offer) => offers.set(offer.get('sku'), offer),
                offers
              ),
          offers
        )
      }, immutable.Map())
    // filter out out of stock
    lines = lines.map(line =>
      line.update('retailers', retailers =>
        retailers.map((part, vendor) => {
          if (part) {
            const sku = immutable.Map({part, vendor})
            const offer = offers.get(sku)
            let in_stock, stock_location
            if (offer) {
              in_stock = offer.get('in_stock_quantity')
              stock_location = offer.get('stock_location')
            }
            if (
              in_stock &&
              in_stock >= line.get('quantity') &&
              stock_location !== 'US'
            ) {
              return part
            }
          }
          return ''
        })
      )
    )
    lines = reduceBom(lines, preferred)
    const priority = priorityOfRetailers(lines).filter(r => r !== preferred)
    const {reducedLines} = priority.reduce(
      ({reducedLines, done}, retailer) => {
        reducedLines = reduceBom(reducedLines, retailer, done)
        done = done.push(retailer)
        return {reducedLines, done}
      },
      {reducedLines: lines, done: immutable.List.of(preferred)}
    )
    selectionNumbers = retailerSelectionNumbers(reducedLines)
  }
  return {
    selectionNumbers,
    extensionPresent,
    preferredRetailer: state.view.get('preferredRetailer')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(BuyParts)