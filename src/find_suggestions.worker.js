import {bindActionCreators} from 'redux'
import {fromJS} from 'immutable'

import {findSuggestions} from './find_suggestions'
import {actions as unboundActions} from './state'

/* global self */

const dispatch = action => {
  if (action.value.suggestions) {
    action.value.suggestions = action.value.suggestions.toJS()
  }
  self.postMessage(action)
}

const actions = bindActionCreators(unboundActions, dispatch.bind(this))

self.addEventListener('message', event => {
  const {lineId, line, suggestions} = event.data
  findSuggestions(lineId, fromJS(line), fromJS(suggestions), actions)
})
