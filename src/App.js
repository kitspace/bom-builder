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
        unstackable={true}
        singleLine
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
  return (
    <tbody>
      {lines.map(line => Row({editing, line}))}
    </tbody>
  )
}

const EditInput = React.createClass({
  getInitialState() {
    return {value: this.props.value}
  },
  handleChange(event) {
    this.setState({value: event.target.value})
    clearTimeout(this.timeout)
    this.timeout = setTimeout(function(value) {
      clearTimeout(this.timeout)
      this.props.onChange(value)
    }.bind(this, event.target.value), 100)
  },
  skipInitialBlur: true,
  handleBlur(event) {
    //this is for firefox where we get an initial blur event on number inputs
    //which we need to ignore
    if (this.skipInitialBlur && this.props.type === 'number') {
      this.skipInitialBlur = false
    } else {
      this.props.onBlur(event)
    }
  },
  render() {
    return (
      <input
        spellCheck={false}
        value={this.state.value}
        onChange={this.handleChange}
        onBlur={this.handleBlur}
        ref={input => {this.input = input}}
        type={this.props.type || null}
      />
    )
  },
  componentDidMount() {
    this.input.focus()
    this.skipInitialBlur = false
  },
})

function editingThis(editing, id, field) {
  return editing &&
    immutable.fromJS(editing).equals(immutable.fromJS([id, field]))
}

function setField(id, field) {
  return value => store.dispatch(actions.set({
    id,
    field,
    value,
  }))
}

function EditableCell({editing, line, field}) {
  if (field[0] === 'reference') {
    var className = `marked ${markerColor(line.getIn(field))}`
  } else if (field[0] === 'quantity') {
    var type = 'number'
  }
  const id = line.get('id')
  const value = line.getIn(field)
  const active = editingThis(editing, id, field)
  return (
    <semantic.Table.Cell
      selectable={!!editing}
      active={active}
      className={className}
      onClick={editing ? () => store.dispatch(actions.edit([id, field])) : null}
      style={{maxWidth: active ? '' : 200}}
    >
      <a
        style={{maxWidth: active ? '' : 200}}
      >
        {(() => {
          if (active) {
            return (
              [
              <EditInput
                onChange={setField(id, field)}
                onBlur={(event) => store.dispatch(actions.edit([null, null]))}
                value={value}
                type={type}
                key='EditInput'
              />
              ,
              //here to make sure the cell doesn't shrink
              <div key='div' style={{visibility: 'hidden', height: 0}}>{value}</div>
              ]
            )
          }
          return value
        })()}
      </a>
    </semantic.Table.Cell>
  )
}

function Row({editing, line}) {
  const iLine = immutable.fromJS(line)
  return (
    <tr key={line.id}>
      <EditableCell editing={editing} line={iLine} field={['reference']}/>
      <EditableCell editing={editing} line={iLine} field={['quantity']}/>
      {(() => {
        const ps = line.partNumbers.map((mpn, i) => {
          return [
              <EditableCell
                key={`manufacturer-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'manufacturer']}
              />
           ,
              <EditableCell
                key={`part-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'part']}
              />
          ]
        })
        return ps
      })()}
      {oneClickBom.lineData.retailer_list.map(name => {
        return (
          <EditableCell
            key={`${line.id}-${name}`}
            editing={editing}
            line={iLine}
            field={['retailers', name]}
          />
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
