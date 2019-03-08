import React from 'react'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import ReactProgress from 'react-progress'
import * as reselect from 'reselect'

import {actions} from './state'
import * as selectors from './selectors'

function ProgressBar(props) {
  return (
    <ReactProgress
      style={{zIndex: 10001, boxShadow: 'none'}}
      color="#21BA45"
      percent={props.percent}
    />
  )
}

function loadingSelector(state) {
  const view = state.view
  return view.get('loadingFile')
}


function mapStateToProps(state, props) {
  return reselect.createSelector([loadingSelector], loading => ({
    percent: loading
  }))
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(
  ProgressBar
)