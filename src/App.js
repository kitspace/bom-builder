import './App.css'
import 'semantic-ui-css/semantic.css'

import React from 'react'
import * as immutable from 'immutable'
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
import BuyParts from './buy_parts'
import ProgressBar from './progress_bar'
import FindSuggestionsWorker from './find_suggestions.worker.js'

import {subscribeEffects} from './effects'
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

const findSuggestionsWorker = new FindSuggestionsWorker()
findSuggestionsWorker.addEventListener('message', ({data: action}) => {
  if (action.value.suggestions) {
    action.value.suggestions = immutable.fromJS(action.value.suggestions)
  } else if (action.type === 'replaceSuggestions') {
    action.value = immutable.fromJS(action.value)
  }
  store.dispatch(action)
})

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
      const state = store.getState()
      const lines = state.data.present.get('lines')
      const suggestions = state.suggestions
      return findSuggestionsWorker.postMessage({
        type: 'replace',
        lines: lines.toJS(),
        suggestions: suggestions.toJS()
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

window.addEventListener(
  'message',
  event => {
    if (event.source !== window) {
      return
    }
    if (event.data.from === 'extension') {
      actions.registerExtension()
    }
    if (event.data.message === 'bomBuilderResult') {
      const {retailer, result} = event.data.value
      actions.addBuyPartsResult({retailer, result})
    }
  },
  false
)

class Bom extends React.Component {
  render() {
    return (
      <reactRedux.Provider store={store}>
        <div>
          <ProgressBar />
          <div
            className="ui fixed top sticky"
            style={{
              width: '100%',
              background: 'white',
              zIndex: 10000
            }}
          >
            <div style={{display: 'flex'}}>
              <Menu
                downloadBom={downloadBom}
                copyBom={copyBom}
                handleFileInput={handleFileInput}
                clearAll={this.props.clearAll}
              />
              <BuyParts />
            </div>
          </div>
          <div
            className="ui fixed top sticky"
            style={{
              width: '100%',
              background: 'white',
              borderBottom: '1px solid #e6e6e6',
              overflow: 'hidden',
              zIndex: 9999,
              height: 80
            }}
          >
            <semantic.Table
              className="Bom"
              size="small"
              celled
              unstackable
              singleLine
              style={{marginTop: 60}}
            >
              <Header />
              <Body hidden />
            </semantic.Table>
          </div>
          <semantic.Table
            className="Bom"
            size="small"
            celled
            unstackable
            singleLine
            style={{marginTop: 59}}
          >
            <Header />
            <Body />
          </semantic.Table>
          <semantic.Button
            onClick={actions.addEmptyLine}
            basic
            icon={<semantic.Icon name="plus" />}
          />
        </div>
      </reactRedux.Provider>
    )
  }
  componentDidMount() {
    const storedData = localStorage.getItem('tsv') || initialStoredData
    const {lines} = oneClickBom.parseTSV(storedData)
    lines.forEach(line => {
      delete line.retailers.Rapid
      delete line.retailers.Newark
    })
    actions.initializeLines(lines)
    findSuggestionsWorker.postMessage({
      type: 'replace',
      lines: store
        .getState()
        .data.present.get('lines')
        .toJS(),
      suggestions: {}
    })
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
    if (storedData === initialStoredData) {
      actions.setFocus([0, ['description']])
    }
  }
}

export default Bom
