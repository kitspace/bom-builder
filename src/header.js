const React       = require('react')
const semantic    = require('semantic-ui-react')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const oneClickBom = require('1-click-bom')

const {actions} = require('./state')

function Header({viewState, lines, sortBy, togglePartNumbersExpanded}) {
  if (viewState.partNumbersExpanded) {
    var maxPartNumbers = oneClickBom.lineData.maxPartNumbers(lines)
  } else {
    var maxPartNumbers = 1
  }
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
          let headerClassName = ''
          if (viewState.partNumbersExpanded) {
            headerClassName = 'expandedHeader'
            cells.push(
              <td className='collapserCell' key='button'>
                <semantic.Button
                  basic
                  size='tiny'
                  onClick={() => togglePartNumbersExpanded()}
                >
                  ⇠ hide
                </semantic.Button>
              </td>
            )
          }
          for (let i = 0; i < maxPartNumbers; ++i) {
            if (viewState.partNumbersExpanded) {
              cells.push(
                <th className={headerClassName} key={`Manufacturer${i}`}>
                  <a onClick={() => sortBy(['manufacturer', i])}>
                    Manufacturer
                  </a>
                </th>
              )
            }
            cells.push(
              <th className={headerClassName} key={`MPN${i}`}>
                <div className='headerWithButton'>
                <a onClick={() => sortBy(['part', i])}>
                  Part Number
                </a>
                {(() => {
                  if (!viewState.partNumbersExpanded && i === 0) {
                    return  (
                      <semantic.Button
                        basic
                        size='tiny'
                        onClick={() => togglePartNumbersExpanded()}
                      >
                      more ...
                      </semantic.Button>
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
  return {
    viewState: state.view.toJS(),
    lines: state.data.present.get('lines').toJS()
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Header)
