function suggestions(state) {
  return state.suggestions
}

function line(state, props) {
  return state.data.present.getIn(['lines', props.index])
}

function view(state) {
  return state.view
}

module.exports = {
  line,
  suggestions,
  view,
}
