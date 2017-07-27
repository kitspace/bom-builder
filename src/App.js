import './App.css'
import 'semantic-ui-css/semantic.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')

const {mainReducer, initialState, actions} = require('./state')

const App = React.createClass({
  store: redux.createStore(mainReducer, initialState),
  getInitialState() {
    return this.store.getState().toJS()
  },
  render() {
    return (
      <semantic.Table celled unstackable={true}>
        <Header lines={this.state.lines} />
        <Body lines={this.state.lines} />
      </semantic.Table>
    )
  },
  componentDidMount() {
    superagent.get('/1-click-BOM.tsv').then(r => {
      this.store.dispatch({type: 'setFromTsv', value: r.text})
    })
    this.store.subscribe(() => {
      const state = this.store.getState().toJS()
      this.setState(state)
    })
  },
})

function Header({lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)
  return (
    <semantic.Table.Header>
      <semantic.Table.HeaderCell>
        References
      </semantic.Table.HeaderCell>
      <semantic.Table.HeaderCell>
        Qty
      </semantic.Table.HeaderCell>
      {(() => {
        const cells = []
        for (let i = 0; i < maxMpns; ++i) {
          cells.push(
            <semantic.Table.HeaderCell>
              Manufacturer
            </semantic.Table.HeaderCell>
          )
          cells.push(
            <semantic.Table.HeaderCell>
              MPN
            </semantic.Table.HeaderCell>
          )
        }
        return cells
      })()}
    </semantic.Table.Header>
  )
}

function Body({lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)

  return (
    <semantic.TableBody>
      {lines.map(line => Row({line, maxMpns}))}
    </semantic.TableBody>
  )
}

function Row({line, maxMpns}) {
  return (
    <semantic.Table.Row>
      <semantic.Table.Cell>
        {line.reference}
      </semantic.Table.Cell>
      <semantic.Table.Cell>
        {line.quantity}
      </semantic.Table.Cell>
      {(() => {
        const ps = line.partNumbers.map(mpn => {
          return [
            <semantic.Table.Cell>
              {mpn.manufacturer}
            </semantic.Table.Cell>
           ,
            <semantic.Table.Cell>
              {mpn.part}
            </semantic.Table.Cell>
          ]
        })
        while (ps.length < maxMpns) {
          ps.push([<semantic.Table.Cell />, <semantic.Table.Cell />])
        }
        return ps
      })()}
    </semantic.Table.Row>
  )
}




export default App
