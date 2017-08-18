const React       = require('react')
const semantic    = require('semantic-ui-react')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const reselect    = require('reselect')

const selectors = require('./selectors')
const {actions} = require('./state')
const EditableCell = require('./editable_cell')
const Handle = require('./handle')

function Line(props) {
  const {
    viewState,
    line,
    index,
    editing,
    lineId,
  } = props
  const id = lineId
  const partNumbersExpanded = viewState.get('partNumbersExpanded')
  return (
    <semantic.Table.Row
      active={editing && editing.get(0) === index}
    >
      <Handle index={index} />
      <EditableCell
        field={['reference']}
        index={index}
      />
      <EditableCell
        field={['quantity']}
        index={index}
      />
      <EditableCell
        field={['description']}
        index={index}
      />
      {(() => {
        const ps = line.get('partNumbers')
        return ps.map((mpn, i) => {
          const cells = []
          if (partNumbersExpanded.get(i)) {
            const field = ['partNumbers', i, 'manufacturer']
            cells.push(
              <EditableCell
                key={`manufacturer-${i}`}
                field={field}
                index={index}
              />
            )
          }
          const field = ['partNumbers', i, 'part']
          cells.push(
              <EditableCell
                key={`part-${i}`}
                field={field}
                index={index}
                expanded={partNumbersExpanded.get(i)}
              />
          )
          return cells
        })
      })()}
      {(() => {
        return oneClickBom.lineData.retailer_list.map((name, i) => {
          const field = ['retailers', name]
          return (
            <EditableCell
              key={name}
              field={field}
              index={index}
            />
          )})
      })()}
    </semantic.Table.Row>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function mapStateToProps() {
  return reselect.createSelector(
    [selectors.line, selectors.view, editingSelector],
    (line, viewState, editing) => ({
      line,
      viewState,
      editing,
    })
  )
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Line)
