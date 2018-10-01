import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import immutable from 'immutable'
import {FilePicker} from 'react-file-picker'

import {emptyLine, actions} from './state'

function Menu(props) {
  return (
    <semantic.Menu secondary>
      <FilePicker onChange={props.handleFileInput}>
        <semantic.Menu.Item>
          <semantic.Icon name="folder open outline" />
          Open
        </semantic.Menu.Item>
      </FilePicker>
      <semantic.Menu.Item disabled={props.empty} onClick={props.downloadBom}>
        <semantic.Icon name="save" />
        Save
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.undosAvailable} onClick={props.undo}>
        <semantic.Icon name="undo" />
        Undo
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.redosAvailable} onClick={props.redo}>
        <semantic.Icon name="repeat" />
        Redo
      </semantic.Menu.Item>
      <semantic.Menu.Item
        disabled={props.deleteFocus.get(0) == null}
        onClick={() => {
          props.remove(props.deleteFocus)
        }}
      >
        <semantic.Icon name="x" />
        Delete
      </semantic.Menu.Item>
      <semantic.Menu.Item
        disabled={props.empty}
        onClick={() => {
          props.clearAll()
          props.addEmptyLine()
        }}
      >
        <semantic.Icon name="trash" />
        Remove All
      </semantic.Menu.Item>
    </semantic.Menu>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const focus = state.view.get('focus')
  const field = immutable.List.of('lines', focus.get(0)).concat(focus.get(1))
  const value = state.data.present.getIn(field)
  const partNumbersExpanded = state.view
    .get('partNumbersExpanded')
    .get(field.get(3))
  let deleteFocus = focus
  //if partNumber is not expanded delete the whole number
  if (field.get(2) === 'partNumbers' && !partNumbersExpanded) {
    const mpn = state.data.present.getIn(field.pop())
    if (!mpn || (!mpn.get('part') && !mpn.get('manufacturer'))) {
      deleteFocus = immutable.List.of(null)
    } else {
      deleteFocus = deleteFocus.update(1, f => f.slice(0, 2))
    }
  } else if (field.get(2) === 'quantity' || value === '') {
    //don't delete quantity or empty fields
    deleteFocus = immutable.List.of(null)
  }
  return {
    undosAvailable: !!state.data.past.length,
    redosAvailable: !!state.data.future.length,
    empty:
      state.data.present.get('lines').size === 0 ||
      state.data.present.get('lines').get(0) === emptyLine,
    deleteFocus
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Menu)
