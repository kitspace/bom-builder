import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import immutable from 'immutable'

import {actions} from './state'

function Menu(props) {
  return (
    <semantic.Menu secondary>
      <input
        type="file"
        onChange={props.handleFileInput}
        id="uploadInput"
        style={{display: 'none'}}
      />
      <label className="item" htmlFor="uploadInput">
        <semantic.Icon name="folder open outline" />
        Open
      </label>
      <semantic.Menu.Item
        disabled={props.empty}
        onClick={() => {
          props.clearAll()
        }}
      >
        <semantic.Icon name="file outline" />
        New
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={props.empty} onClick={props.downloadBom}>
        <semantic.Icon name="download" />
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
  const lines = state.data.present.get('lines')
  return {
    undosAvailable: !!state.data.past.length,
    redosAvailable: !!state.data.future.length,
    empty: lines.size === 0 || (lines.size === 1 && isEmpty(lines.first())),
    deleteFocus
  }
}

function isEmpty(line) {
  return line.reduce((prev, v, k) => {
    switch (k) {
      case 'retailers':
        return prev && isEmptyRetailers(v)
      case 'partNumbers':
        return prev && isEmptyPartnumbers(v)
      case 'quantity':
        return prev && v <= 1
      case 'description':
        return prev && !v
      default:
        return prev
    }
  }, true)
}

function isEmptyPartnumbers(ps) {
  return ps.reduce(
    (prev, p) => prev && !(p.get('part') || p.get('manufacturer')),
    true
  )
}

function isEmptyRetailers(r) {
  return r.reduce((prev, v, k) => {
    return prev && !v
  }, true)
}
export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Menu)
