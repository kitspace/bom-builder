import {bindActionCreators} from 'redux'
import immutable, {fromJS} from 'immutable'

import {findSuggestions} from './find_suggestions'
import {actions as unboundActions} from './state'

const dispatch = action => {
  if (action.value.suggestions) {
    action.value.suggestions = action.value.suggestions.toJS()
  } else if (action.type === 'replaceSuggestions') {
    action.value = action.value.toJS()
  }
  // eslint-disable-next-line no-restricted-globals
  self.postMessage(action)
}

const actions = bindActionCreators(unboundActions, dispatch)

// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', async event => {
  if (event.data.type === 'single') {
    let {lineId, line, suggestions} = event.data
    actions.setSuggestionsStatus({lineId, status: 'loading'})
    suggestions = await findSuggestions(fromJS(line), fromJS(suggestions))
    actions.addSuggestions({lineId, suggestions})
    actions.setSuggestionsStatus({lineId, status: 'done'})
  } else if (event.data.type === 'replace') {
    let {lines, suggestions} = event.data
    lines = fromJS(lines)
    suggestions = fromJS(suggestions)
    const newSuggestions = await Promise.all(
      lines.entrySeq().map(async ([lineId, line]) => {
        let s = suggestions.getIn([lineId, 'data'])
        s = await findSuggestions(line, s)
        return [lineId, s]
      })
    ).then(immutable.Map)
    actions.replaceSuggestions(newSuggestions)
  }
})
