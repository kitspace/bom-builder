const React      = require('react')
const semantic   = require('semantic-ui-react')
const reactRedux = require('react-redux')
const redux      = require('redux')

const {actions} = require('./state')

function Menu(props) {
  return (
    <semantic.Menu secondary>
      <semantic.Menu.Item onClick={props.save}>
        <semantic.Icon name='save' />
        Save
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.undosAvailable} onClick={props.undo}>
        <semantic.Icon name='undo' />
        Undo
      </semantic.Menu.Item>
      <semantic.Menu.Item disabled={!props.redosAvailable} onClick={props.redo}>
        <semantic.Icon name='repeat' />
        Redo
      </semantic.Menu.Item>
      <semantic.Menu.Item
        disabled={props.deleteFocus[0] == null}
        onClick={() => {
          props.remove(props.deleteFocus)
        }}
      >
        <semantic.Icon name='x' />
        Delete
      </semantic.Menu.Item>
    </semantic.Menu>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  const focus = state.view.get('focus').toJS()
  const field = ['lines'].concat([focus[0]]).concat(focus[1])
  const value = state.data.present.getIn(field)
  const deleteFocus = (field[2] === 'quantity' || value === '') ?
    [null, null] : focus
  return {
    undosAvailable: !!state.data.past.length,
    redosAvailable: !!state.data.future.length,
    deleteFocus,
  }
}

module.exports = reactRedux.connect(mapStateToProps, mapDispatchToProps)(Menu)
