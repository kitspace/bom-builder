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
    togglePartNumbersExpanded
  } = props
  const editing = viewState.editable ? viewState.focus : null
  return (
    <tbody>
      {lines.map((line, index) => Line({
        viewState,
        editing,
        line,
        index,
        lines,
        setField,
        setFocus,
        togglePartNumbersExpanded,
        ...props
      }))}
    </tbody>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  return {
    viewState: state.view.toJS(),
    lines: state.data.present.get('lines').toJS()
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Body)
