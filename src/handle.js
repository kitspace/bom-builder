import React from 'react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'

import {actions} from './state'

class Handle extends React.Component {
  setFocus = () => {
    this.props.setFocus([this.props.lineId, null])
  }
  loseFocus = () => {
    setTimeout(() => {
      this.props.loseFocus([this.props.lineId, null])
    }, 100)
  }
  handleKeyDown = e => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.props.removeLine(this.props.lineId)
    } else if (e.key === 'Escape') {
      this.props.loseFocus([this.props.lineId, null])
    }
  }
  render() {
    const props = this.props
    const {reference, lineId, removeLine} = props
    return (
      <td className={`marked ${markerColor(reference)}`}>
        <input
          style={{height: 17}}
          onFocus={this.setFocus}
          onBlur={this.loseFocus}
          className="mousetrap"
          readOnly
          onKeyDown={this.handleKeyDown}
        />
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
