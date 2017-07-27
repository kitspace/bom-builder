import './App.css'
import 'semantic-ui-css/semantic.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')

const {mainReducer, initialState, actions} = require('./state')
const store = redux.createStore(mainReducer, initialState)

const Bom = React.createClass({
  getInitialState() {
    return store.getState().toJS()
  },
  render() {
    const editing = this.props.editable ? this.state.view.editing : null
    return (
      <semantic.Table className='Bom' celled unstackable={true}>
        <Header lines={this.state.editable.lines} />
        <Body editing={editing} lines={this.state.editable.lines} />
      </semantic.Table>
    )
  },
  componentDidMount() {
    superagent.get('1-click-BOM.tsv').then(r => {
      store.dispatch(actions.setFromTsv(r.text))
    })
    store.subscribe(() => {
      const state = store.getState().toJS()
      this.setState(state)
    })
  },
})

function Header({lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)
  return (
    <semantic.Table.Header>
      <tr>
        <semantic.Table.HeaderCell >
          <a onClick={() => store.dispatch(actions.sortBy('reference'))}>
            References
          </a>
        </semantic.Table.HeaderCell>
        <semantic.Table.HeaderCell >
          <a onClick={() => store.dispatch(actions.sortBy('quantity'))}>
            Qty
          </a>
        </semantic.Table.HeaderCell>
        {(() => {
          const cells = []
          for (let i = 0; i < maxMpns; ++i) {
            cells.push(
              <semantic.Table.HeaderCell key={`Manufacturer${i}`}>
                <a onClick={() => store.dispatch(actions.sortBy(['manufacturer', i]))}>
                  Manufacturer
                </a>
              </semantic.Table.HeaderCell>
            )
            cells.push(
              <semantic.Table.HeaderCell key={`MPN${i}`}>
                <a onClick={() => store.dispatch(actions.sortBy(['part', i]))}>
                  MPN
                </a>
              </semantic.Table.HeaderCell>
            )
          }
          return cells
        })()}
        {oneClickBom.lineData.retailer_list.map(retailer => {
          return (
            <semantic.Table.HeaderCell key={retailer}>
              <a onClick={() => store.dispatch(actions.sortBy(retailer))}>
                {retailer}
              </a>
            </semantic.Table.HeaderCell>
          )
        })}
      </tr>
    </semantic.Table.Header>
  )
}

function Body({editing, lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)

  return (
    <semantic.TableBody>
      {lines.map(line => Row({editing, line, maxMpns}))}
    </semantic.TableBody>
  )
}

const EditInput = React.createClass({
  render() {
    return (
      <input
        spellCheck={false}
        value={this.props.value}
        onChange={this.props.onChange}
        ref={input => {this.input = input}}
      />
    )
  },
  componentDidMount() {
    this.input.focus()
  }
})

function editingThis(editing, id, ref) {
  return immutable.List(editing).equals(immutable.List.of(id, ref))
}

function Row({editing, line, maxMpns}) {
  function setField(field, event) {
    store.dispatch(actions.set({
      location: {id: line.id, field},
      value: event.target.value
    }))
  }
  return (
    <semantic.Table.Row key={line.id}>
      <semantic.Table.Cell selectable={!!editing} className={`marked ${markerColor(line.reference)}`}>
        {(() => {
          if (!editing) {
            return line.reference
          }
          return (
            <a
              onClick={() => store.dispatch(actions.edit([line.id, 'reference']))}
            >
              {(() => {
                if (editingThis(editing, line.id, 'reference')) {
                  return (
                    <EditInput
                      onChange={setField.bind(null, ['reference'])}
                      value={line.reference}
                    />
                  )
                }
                return line.reference
              })()}
            </a>
          )
        })()}
      </semantic.Table.Cell>
      <semantic.Table.Cell>
        {line.quantity}
      </semantic.Table.Cell>
      {(() => {
        const ps = line.partNumbers.map(mpn => {
          return [
            <semantic.Table.Cell key={`${line.id}-${mpn.manufacturer}`}>
              {mpn.manufacturer}
            </semantic.Table.Cell>
           ,
            <semantic.Table.Cell key={`${line.id}-${mpn.part}`}>
              {mpn.part}
            </semantic.Table.Cell>
          ]
        })
        while (ps.length < maxMpns) {
          ps.push([<semantic.Table.Cell />, <semantic.Table.Cell />])
        }
        return ps
      })()}
      {oneClickBom.lineData.retailer_list.map(name => {
        return (
          <semantic.Table.Cell key={`${line.id}-${name}`}>
            {line.retailers[name]}
          </semantic.Table.Cell>
        )
      })}
    </semantic.Table.Row>
  )
}

function markerColor(ref) {
  if (/^C\d/.test(ref)) {
    return 'orange'
  }
  if (/^R\d/.test(ref)) {
    return 'lightblue'
  }
  if (/^IC\d/.test(ref) || /^U\d/.test(ref)) {
    return 'blue'
  }
  if (/^L\d/.test(ref)) {
    return 'black'
  }
  if (/^D\d/.test(ref)) {
    return 'green'
  }
  if (/^LED\d/.test(ref)) {
    return 'yellow'
  }
  return 'purple'
}



export default Bom
