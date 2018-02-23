import './App.css'
import 'semantic-ui-css/semantic.css'
import './fontello.css'

const React = require('react')
const semantic = require('semantic-ui-react')
const redux = require('redux')
const reactRedux = require('react-redux')
const oneClickBom = require('1-click-bom')
const mousetrap = require('mousetrap')
const copyToClipboard = require('copy-to-clipboard')
const fileDownload = require('js-file-download')

const Header = require('./header')
const Body = require('./body')
const Menu = require('./menu')

const {subscribeEffects} = require('./effects')
const {findSuggestions} = require('./suggestions')
const {mainReducer, initialState} = require('./state')

function readSingleFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const contents = e.target.result
      resolve(contents)
    }
    reader.readAsText(file)
  })
}

const store = redux.createStore(
  mainReducer,
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
const actions = redux.bindActionCreators(
  require('./state').actions,
  store.dispatch
)

function handleFileInput(file) {
  return readSingleFile(file)
    .then(oneClickBom.parseTSV)
    .then(r => {
      if (r.invalid.length > 0) {
        const text = r.invalid.reduce((p, x) => {
          return p + `\trow ${x.row}: ${x.reason}\n`
        }, `Error${r.invalid.length > 1 ? 's' : ''}: \n`)
        alert(text)
        return Promise.reject(text)
      }
      if (r.warnings.length > 0) {
        console.warn(r.warnings)
      }
      actions.initializeLines(r.lines)
      store
        .getState()
        .data.present.get('lines')
        .map((line, lineId) => {
          const state = store.getState()
          line = state.data.present.getIn(['lines', lineId])
          const suggestions = state.suggestions.getIn([lineId, 'data'])
          return findSuggestions(lineId, line, suggestions, actions)
        })
    })
}

function getTsv() {
  const state = store.getState()
  const linesMap = state.data.present
    .get('lines')
    .map(line => line.update('partNumbers', ps => ps.slice(0, -1)))
  const order = state.data.present.get('order')
  const lines = order.map(lineId => linesMap.get(lineId)).toJS()
  return oneClickBom.writeTSV(lines)
}

function copyBom() {
  const tsv = getTsv()
  const copyHandler = e => {
    e.clipboardData.setData('text/plain', tsv)
    e.preventDefault()
  }
  document.addEventListener('copy', copyHandler)
  copyToClipboard(tsv)
  document.removeEventListener('copy', copyHandler)
}

function downloadBom() {
  const tsv = getTsv()
  fileDownload(tsv, '1-click-bom.tsv')
}

subscribeEffects(store, actions)

class Bom extends React.Component {
  constructor(props) {
    super(props)
    this.state = {height: window.innerHeight}
  }
  render() {
    return (
      <reactRedux.Provider store={store}>
        <div style={{height: this.state.height}} className="tableScroller">
          <Menu
            downloadBom={downloadBom}
            copyBom={copyBom}
            handleFileInput={handleFileInput}
          />
          <div style={{display: 'flex'}}>
            <semantic.Table
              className="Bom"
              size="small"
              celled
              unstackable
              singleLine
            >
              <Header />
              <Body />
            </semantic.Table>
          </div>
          <semantic.Button
            onClick={() => actions.addEmptyLine()}
            basic
            icon={<semantic.Icon name="plus" />}
          />
        </div>
      </reactRedux.Provider>
    )
  }
  componentWillMount() {
    actions.addEmptyLine()
    window.onresize = e => {
      this.setState({height: window.innerHeight})
    }
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
  }
}

export default Bom
