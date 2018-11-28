import './App.css'
import 'semantic-ui-css/semantic.css'

import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as oneClickBom from '1-click-bom'
import * as mousetrap from 'mousetrap'
import * as copyToClipboard from 'copy-to-clipboard'
import * as fileDownload from 'js-file-download'

import Header from './header'
import Body from './body'
import Menu from './menu'

import {subscribeEffects} from './effects'
import {findSuggestions} from './suggestions'
import {mainReducer, initialState, actions as unboundActions} from './state'

const initialStoredData =
  'References\tQty\tDescription\tDigikey\tMouser\tRS\tNewark\tFarnell\tRapid\n\t1\t\t\t\t\t\t\t\n'

function readSingleFile(file, asString = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const contents = e.target.result
      resolve(contents)
    }
    if (asString) {
      return reader.readAsText(file)
    }
    return reader.readAsArrayBuffer(file)
  })
}

const store = redux.createStore(
  mainReducer,
  initialState,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

let previous_tsv
let previous_state
store.subscribe(() => {
  const state = store.getState().data.present
  if (state !== previous_state) {
    const tsv = getTsv()
    if (tsv !== previous_tsv) {
      localStorage.setItem('tsv', tsv)
      previous_tsv = tsv
    }
    previous_state = state
  }
})

const actions = redux.bindActionCreators(unboundActions, store.dispatch)

function handleFileInput(e) {
  const file = e.target.files[0]
  if (!file) {
    return
  }
  let parse = oneClickBom.parse
  let asString = false
  if (/^text\//.test(file.type)) {
    asString = true
  }
  if (file.type === 'application/x-kicad-pcb') {
    asString = true
    parse = contents => oneClickBom.parse(contents, {ext: 'kicad_pcb'})
  }
  return readSingleFile(file, asString)
    .then(parse)
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

function getLines() {
  const state = store.getState()
  const linesMap = state.data.present
    .get('lines')
    .map(line => line.update('partNumbers', ps => ps.slice(0, -1)))
    .map(line => line.set('reference', line.get('reference') || ''))
  const order = state.data.present.get('order')
  return order.map(lineId => linesMap.get(lineId)).toJS()
}

function getTsv() {
  const lines = getLines()
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
  const lines = getLines()
  const csv = oneClickBom.write(lines, {type: 'string', bookType: 'csv'})
  fileDownload(csv, '1-click-bom.csv')
}

subscribeEffects(store, actions)

class Bom extends React.Component {
  constructor(props, ...args) {
    super(props, ...args)
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
            clearAll={this.props.clearAll}
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
            onClick={actions.addEmptyLine}
            basic
            icon={<semantic.Icon name="plus" />}
          />
          <semantic.Container className="infoBox">
            <semantic.Segment style={{fontSize: 18}}>
              This is an{' '}
              <a href="https://github.com/kitspace/bom-builder">open source</a>{' '}
              prototype of an electronics bill of materials editor tool for{' '}
              <a href="https://kitspace.org">Kitspace</a>. Try typing in a
              component description above (e.g. <code>1uF 0805</code>) or
              opening an existing BOM (csv, xlsx, ods etc.). If you are confused
              maybe{' '}
              <a href="https://www.youtube.com/watch?v=m96G7B1doRQ">
                watch the demo
              </a>{' '}
              but don't hesistate to jump{' '}
              <a href="https://github.com/kitspace/kitspace/issues">
                on GitHub
              </a>{' '}
              or{' '}
              <a href="https://riot.im/app/#/room/#kitspace:matrix.org">chat</a>{' '}
              if you have any issues or questions!
            </semantic.Segment>
          </semantic.Container>
        </div>
      </reactRedux.Provider>
    )
  }
  componentDidMount() {
    const storedData = localStorage.getItem('tsv') || initialStoredData
    const {lines} = oneClickBom.parseTSV(storedData)
    actions.initializeLines(lines)
    const state = store.getState()
    state.data.present.get('lines').forEach((line, id) => {
      const suggestions = state.suggestions.getIn([id, 'data'])
      findSuggestions(id, line, suggestions, actions)
    })
    window.onresize = e => {
      this.setState({height: window.innerHeight})
    }
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
    if (storedData === initialStoredData) {
      actions.setFocus([0, ['description']])
    }
  }
}

export default Bom
