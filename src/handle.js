import React from 'react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import * as semantic from 'semantic-ui-react'

import {actions} from './state'

class Handle extends React.Component {
  removeLine = e => {
    this.props.removeLine(this.props.lineId)
  }
  render() {
    return (
      <td
        onClick={this.removeLine}
        className={`handle marked ${markerColor(this.props.reference)}`}
      >
        <semantic.Icon name="x" />
      </td>
    )
  }
}

function markerColor(ref) {
  if (/^C\d/.test(ref)) {
    return 'orange'
  }
  if (/^R\d/.test(ref)) {
    return 'lightblue'
  }
  if (/^IC\d/.test(ref) || /^U\d/.test(ref)) {
    return 'blue'
  }
  if (/^L\d/.test(ref)) {
    return 'black'
  }
  if (/^D\d/.test(ref)) {
    return 'green'
  }
  if (/^LED\d/.test(ref)) {
    return 'yellow'
  }
  return 'purple'
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state, props) {
  return {
    reference: state.data.present.getIn(['lines', props.lineId, 'reference'])
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Handle)
