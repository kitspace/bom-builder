const redux      = require('redux')
const reactRedux = require('react-redux')
const reselect   = require('reselect')

const EditableCell = require('./editable_cell')
const selectors    = require('./selectors')
const {actions}    = require('./state')

function mapStateToProps() {
  const active  = selectors.makeActiveSelector()
  const line    = selectors.makeLineSelector()
  const editing = selectors.makeEditingSelector()
  return reselect.createSelector(
    [line, editing, active],
    (line, editing, active) => ({
      line, editing, active
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(EditableCell)

