import './App.css'
import 'semantic-ui-css/semantic.css'
import './fontello.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')
const mousetrap   = require('mousetrap')
const {snapshot}  = require('react-snapshot')
const DoubleScrollBar = require('react-double-scrollbar')

const Header      = require('./header')
const Body        = require('./body')
const Menu        = require('./menu')

const {subscribeEffects} = require('./effects')
const {findSuggestions}  = require('./suggestions')
const {
  mainReducer,
  initialState,
} = require('./state')


const store = redux.createStore(
  mainReducer,
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
const actions = redux.bindActionCreators(require('./state').actions, store.dispatch)

subscribeEffects(store, actions)

function getTsv() {
  return superagent.get('1-click-BOM.tsv').then(r => {
    const {lines} = oneClickBom.parseTSV(r.text)
    actions.initializeLines(lines)
    return store.getState()
  })
}

snapshot(() => {
  return getTsv().then(state => {
    const ps = state.data.present.get('lines').map((line, lineId) => {
      const state = store.getState()
      line = state.data.present.getIn(['lines', lineId])
      const suggestions = state.suggestions.get(lineId)
      return findSuggestions(lineId, line, suggestions, actions)
    })
    return Promise.all(ps).then(() => store.getState())
  })
}).then(actions.setState)


class Bom extends React.Component {
  render() {
    return (
      <reactRedux.Provider store={store}>
        <DoubleScrollBar>
          <Menu />
          <semantic.Table
            className='Bom'
            size='small'
            celled
            unstackable
            singleLine
          >
            <Header />
            <Body />
          </semantic.Table>
        </DoubleScrollBar>
      </reactRedux.Provider>
    )
  }
  componentWillMount() {
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
  }
}



export default Bom
