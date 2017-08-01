const React      = require('react')
const semantic   = require('semantic-ui-react')
const reactRedux = require('react-redux')
const redux      = require('redux')

const {actions} = require('./state')

function Menu(props) {
  return (
    <semantic.Menu secondary>
      <semantic.Menu.Item>
        Save
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.undosAvailable} onClick={props.undo}>
        Undo
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.redosAvailable} onClick={props.redo}>
        Redo
      </semantic.Menu.Item>
    </semantic.Menu>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  return {
    undosAvailable: !!state.data.past.length,
    redosAvailable: !!state.data.future.length,
  }
}

module.exports = reactRedux.connect(mapStateToProps, mapDispatchToProps)(Menu)
