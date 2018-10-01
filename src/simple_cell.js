import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as reselect from 'reselect'

import EditableCell from './editable_cell'
import selectors from './selectors'
import {actions} from './state'

function mapStateToProps() {
  const active = selectors.makeActiveSelector()
  const value = selectors.makeValueSelector()
  const editing = selectors.makeEditingSelector()
  return reselect.createSelector(
    [value, editing, active],
    (value, editing, active) => ({
      value,
      editing,
      active
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(
  EditableCell
)
