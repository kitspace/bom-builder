const React       = require('react')
const semantic    = require('semantic-ui-react')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const oneClickBom = require('1-click-bom')

const {actions} = require('./state')

function Header({partNumbersExpanded, maxPartNumbers, sortBy, togglePartNumbersExpanded}) {
  return (
    <thead>
      <tr>
        <th colSpan={2}>
          <a onClick={() => sortBy('reference')}>
            References
          </a>
        </th>
        <th >
          <a onClick={() => sortBy('quantity')}>
            Qty
          </a>
        </th>
        <th >
          <a onClick={() => sortBy('description')}>
            Description
          </a>
        </th>
        {(() => {
          const cells = []
          for (let i = 0; i < maxPartNumbers; ++i) {
            if (partNumbersExpanded.get(i)) {
              cells.push(
                <th style={{minWidth: 160}} key={`Manufacturer${i}`}>
                  <div className='headerWithButton'>
                    <semantic.Button
                      basic
                      size='tiny'
                      onClick={() => togglePartNumbersExpanded(i)}
                      content='⇢'
                    />
                    <a onClick={() => sortBy(['manufacturer', i])}>
                      Manufacturer
                    </a>
                  </div>
                </th>
              )
            }
            cells.push(
              <th style={{minWidth: 130}} key={`MPN${i}`}>
                <div className='headerWithButton'>
                <a onClick={() => sortBy(['part', i])}>
                  Part Number
                </a>
                {(() => {
                  if (!partNumbersExpanded.get(i)) {
                    return  (
                      <semantic.Button
                        basic
                        size='tiny'
                        onClick={() => togglePartNumbersExpanded(i)}
                        content='...'
                      />

                    )
                  }
                })()}
              </div>
              </th>
            )
          }
          return cells
        })()}
        {(() => {
          return oneClickBom.lineData.retailer_list.map((retailer, i) => {
            return (
              <th key={retailer}>
                <div className='headerWithButton'>
                  <a onClick={() => sortBy(retailer)}>
                    {retailer}
                  </a>
                  <semantic.Button className='headerButton' basic>
                    <i className='icon-basket-3' />
                  </semantic.Button>
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
  const first = state.data.present.getIn(['lines', 0])
  return {
    partNumbersExpanded,
    maxPartNumbers: first ? first.get('partNumbers').size : 1
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Header)
