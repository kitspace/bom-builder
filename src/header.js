import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import oneClickBom from '1-click-bom'

import {actions} from './state'

function Header({
  partNumbersExpanded,
  maxPartNumbers,
  sortBy,
  togglePartNumbersExpanded
}) {
  return (
    <thead>
      <tr>
        <th colSpan={2}>
          <a onClick={() => sortBy('reference')}>References</a>
        </th>
        <th>
          <a onClick={() => sortBy('quantity')}>Qty</a>
        </th>
        <th>
          <a onClick={() => sortBy('description')}>Description</a>
        </th>
        {(() => {
          const cells = []
          for (let i = 0; i < maxPartNumbers - 1; ++i) {
            if (partNumbersExpanded.get(i)) {
              cells.push(
                <th style={{minWidth: 160}} key={`Manufacturer${i}`}>
                  <div className="headerWithButton">
                    <a onClick={() => sortBy(['manufacturer', i])}>
                      Manufacturer
                    </a>
                  </div>
                </th>
              )
            }
            cells.push(
              <th style={{minWidth: 130}} key={`MPN${i}`}>
                <div className="headerWithButton">
                  {(() => {
                    if (!partNumbersExpanded.get(i)) {
                      return (
                        <semantic.Label
                          basic
                          onClick={() => togglePartNumbersExpanded(i)}
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
                          onClick={() => togglePartNumbersExpanded(i)}
                          className="expandLabel"
                        >
                          <semantic.Icon name="angle double right" />
                          <semantic.Icon name="angle double left" />
                        </semantic.Label>
                      )
                    }
                  })()}
                  <a onClick={() => sortBy(['part', i])}>Part Number</a>
                </div>
              </th>
            )
          }
          cells.push(<th key="MPN-last">...</th>)
          return cells
        })()}
        {(() => {
          return oneClickBom
            .getRetailers()
            .filter(r => r !== 'Rapid')
            .map((retailer, i) => {
              return (
                <th key={retailer}>
                  <div className="headerWithButton">
                    <a onClick={() => sortBy(retailer)}>{retailer}</a>
                    {/*<semantic.Button className="headerButton" basic>
                    <i className="icon-basket-3" />
                  </semantic.Button>*/}
                  </div>
                </th>
              )
            })
        })()}
      </tr>
    </thead>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const partNumbersExpanded = state.view.get('partNumbersExpanded')
  const first = state.data.present.get('lines').first()
  return {
    partNumbersExpanded,
    maxPartNumbers: first ? first.get('partNumbers').size : 1
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Header)
