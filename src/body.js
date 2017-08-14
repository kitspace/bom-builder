const React       = require('react')
const reactRedux  = require('react-redux')
const redux       = require('redux')

const {actions} = require('./state')

const Line = require('./line')

function Body(props) {
  const {
    viewState,
    lines,
    setField,
    setFocus,
    loseFocus,
    setFocusBelow,
    setFocusNext,
    togglePartNumbersExpanded
  } = props
  const editing = viewState.get('editable') ? viewState.get('focus') : null
  return (
    <tbody>
      {lines.map((line, index) => {
        const suggestions = props.suggestions.get(line.get('id'))
        return Line({
          viewState,
          editing,
          line,
          index,
          lines,
          suggestions,
          setField,
          setFocus,
          loseFocus,
          setFocusBelow,
          setFocusNext,
          togglePartNumbersExpanded,
        })
      })}
    </tbody>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  return {
    viewState: state.view,
    lines: state.data.present.get('lines'),
    suggestions: state.suggestions,
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Body)
