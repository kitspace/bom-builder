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
      <semantic.Table
        className='Bom'
        size='small'
        celled
        compact
        unstackable={true}
      >
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
    <thead>
      <tr>
        <th>
          <a onClick={() => store.dispatch(actions.sortBy('reference'))}>
            References
          </a>
        </th>
        <th >
          <a onClick={() => store.dispatch(actions.sortBy('quantity'))}>
            Qty
          </a>
        </th>
        {(() => {
          const cells = []
          for (let i = 0; i < maxMpns; ++i) {
            cells.push(
              <th key={`Manufacturer${i}`}>
                <a onClick={() => store.dispatch(actions.sortBy(['manufacturer', i]))}>
                  Manufacturer
                </a>
              </th>
            )
            cells.push(
              <th key={`MPN${i}`}>
                <a onClick={() => store.dispatch(actions.sortBy(['part', i]))}>
                  MPN
                </a>
              </th>
            )
          }
          return cells
        })()}
        {oneClickBom.lineData.retailer_list.map(retailer => {
          return (
            <th key={retailer}>
              <a onClick={() => store.dispatch(actions.sortBy(retailer))}>
                {retailer}
              </a>
            </th>
          )
        })}
      </tr>
    </thead>
  )
}

function Body({editing, lines}) {
  const maxMpns = oneClickBom.lineData.maxMpns(lines)

  return (
    <tbody>
      {lines.map(line => Row({editing, line, maxMpns}))}
    </tbody>
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
    <tr key={line.id}>
      <semantic.Table.Cell
        selectable={!!editing}
        className={`marked ${markerColor(line.reference)}`}
      >
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
      <td>
        {line.quantity}
      </td>
      {(() => {
        const ps = line.partNumbers.map(mpn => {
          return [
            <td key={`${line.id}-${mpn.manufacturer}`}>
              {mpn.manufacturer}
            </td>
           ,
            <td key={`${line.id}-${mpn.part}`}>
              {mpn.part}
            </td>
          ]
        })
        while (ps.length < maxMpns) {
          ps.push([<td />, <td />])
        }
        return ps
      })()}
      {oneClickBom.lineData.retailer_list.map(name => {
        return (
          <td key={`${line.id}-${name}`}>
            {line.retailers[name]}
          </td>
        )
      })}
    </tr>
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
