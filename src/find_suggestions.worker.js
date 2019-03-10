import {bindActionCreators} from 'redux'
import {fromJS} from 'immutable'

import {findSuggestions} from './find_suggestions'
import {actions as unboundActions} from './state'

const dispatch = action => {
  if (action.value.suggestions) {
    action.value.suggestions = action.value.suggestions.toJS()
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
    suggestions = fromJS(suggestions)
    const newSuggestions = immutable.Map(
      await Promise.all(
        lines.map(async ([lineId, line]) => {
          actions.setSuggestionsStatus({lineId, status: 'loading'})
          let s = suggestions.get(lineId)
          s = await findSuggestions(line, s)
          actions.setSuggestionsStatus({lineId, status: 'done'})
          return [lineId, s]
        })
      )
    )
    actions.replaceSuggestions(newSuggestions)
  }
})
