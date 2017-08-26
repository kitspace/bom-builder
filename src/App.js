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
const copyToClipboard = require('copy-to-clipboard')

const Header = require('./header')
const Body   = require('./body')
const Menu   = require('./menu')

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

function copyBom() {
  const state = store.getState()
  const linesMap = state.data.present.get('lines').map(line => (
    line.update('partNumbers', ps => ps.slice(0, -1))
  ))
  const order = state.data.present.get('order')
  const lines = order.map(lineId => linesMap.get(lineId)).toJS()
  const tsv = oneClickBom.writeTSV(lines)
  const copyHandler = e => {
    e.clipboardData.setData('text/plain', tsv)
    e.preventDefault()
  }
  document.addEventListener('copy', copyHandler)
  copyToClipboard(tsv)
  document.removeEventListener('copy', copyHandler)
}

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
      const suggestions = state.suggestions.getIn([lineId, 'data'])
      return findSuggestions(lineId, line, suggestions, actions)
    })
    return Promise.all(ps).then(() => store.getState())
  })
}).then(actions.setState)


class Bom extends React.Component {
  constructor(props) {
    super(props)
    this.state = {height: window.innerHeight}
  }
  render() {
    return (
      <reactRedux.Provider store={store}>
        <div style={{height: this.state.height}} className='tableScroller'>
          <Menu copyBom={copyBom} />
          <div style={{display: 'flex'}}>
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
        </div>
      </div>
      </reactRedux.Provider>
    )
  }
  componentWillMount() {
    window.onresize = e => {
      this.setState({height: window.innerHeight})
    }
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
  }
}



export default Bom
