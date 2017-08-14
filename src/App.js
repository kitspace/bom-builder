import './App.css'
import 'semantic-ui-css/semantic.css'
import './fontello.css'

const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')
const mousetrap   = require('mousetrap')
const {snapshot}  = require('react-snapshot')
const DoubleScrollBar = require('react-double-scrollbar')

const getPartinfo = require('./get_partinfo')
const Header      = require('./header')
const Body        = require('./body')
const Menu        = require('./menu')

const {subscribeEffects} = require('./effects')
const {findSuggestions}  = require('./suggestions')
const {
  mainReducer,
  initialState,
} = require('./state')


const store   = redux.createStore(mainReducer, initialState)
const actions = redux.bindActionCreators(require('./state').actions, store.dispatch)

function getTsv() {
  return superagent.get('1-click-BOM.tsv').then(r => {
    const {lines} = oneClickBom.parseTSV(r.text)
    actions.initializeLines(lines)
    return store.getState()
  })
}

snapshot(() => {
  return getTsv().then(state => {
    const ps = state.data.present.get('lines').map((line, index) => {
      const state = store.getState()
      line = state.data.present.getIn(['lines', index])
      const suggestions = state.suggestions.get(line.get('id'))
      return findSuggestions(line, suggestions, actions)
    })
    return Promise.all(ps).then(() => store.getState())
  })
}).then(actions.setState)


subscribeEffects(store, actions)


const Bom = createClass({
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
  },
  componentWillMount() {
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
  },
})



export default Bom
