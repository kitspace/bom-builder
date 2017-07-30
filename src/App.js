import './App.css'
import 'semantic-ui-css/semantic.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')
const DoubleScrollBar = require('react-double-scrollbar')

const {mainReducer, initialState, actions} = require('./state')
const store = redux.createStore(mainReducer, initialState)

const Bom = React.createClass({
  getInitialState() {
    return store.getState().toJS()
  },
  render() {
    const editing = this.props.editable ? this.state.view.focus : null
    return (
      <DoubleScrollBar>
        <semantic.Table
          className='Bom'
          size='small'
          celled
          unstackable
          singleLine
        >
          <Header
            viewState={this.state.view}
            lines={this.state.editable.lines}
          />
          <Body
            viewState={this.state.view}
            editing={editing}
            lines={this.state.editable.lines}
          />
        </semantic.Table>
      </DoubleScrollBar>
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

function Header({viewState, lines}) {
  if (viewState.mpnsExpanded) {
    var maxMpns = oneClickBom.lineData.maxMpns(lines)
  } else {
    var maxMpns = 1
  }
  return (
    <thead>
      <tr>
        <th colSpan={2}>
          <a onClick={() => store.dispatch(actions.sortBy('reference'))}>
            References
          </a>
        </th>
        <th >
          <a onClick={() => store.dispatch(actions.sortBy('quantity'))}>
            Qty
          </a>
        </th>
        <th >
          <a onClick={() => store.dispatch(actions.sortBy('description'))}>
            Description
          </a>
        </th>
        {(() => {
          const cells = []
          for (let i = 0; i < maxMpns; ++i) {
            if (viewState.mpnsExpanded) {
              cells.push(
                <th key={`Manufacturer${i}`}>
                  <a onClick={() => store.dispatch(actions.sortBy(['manufacturer', i]))}>
                    Manufacturer
                  </a>
                </th>
              )
            }
            cells.push(
              <th className={i === 0 ? 'headerWithButton' : ''} key={`MPN${i}`}>
                <a onClick={() => store.dispatch(actions.sortBy(['part', i]))}>
                  Part Number
                </a>
                {(() => {
                  if (i === 0) {
                    return  (
                      <semantic.Button
                        basic
                        size='tiny'
                        onClick={() => store.dispatch(actions.toggleMpnsExpanded())}
                      >
                      {viewState.mpnsExpanded ? '⇠ less' : `more ...`}
                      </semantic.Button>
                    )
                  }
                })()}
              </th>
            )
          }
          return cells
        })()}
        {(() => {
          if (viewState.skusExpanded) {
            return oneClickBom.lineData.retailer_list.map((retailer, i) => {
              return (
                <th key={retailer}>
                  <div className={i === 0 ? 'headerWithButton' : ''}>
                  {(() => {
                    if (i === 0) {
                      return (
                        <semantic.Button
                          basic
                          size='tiny'
                          onClick={() => store.dispatch(actions.toggleSkusExpanded())}
                        >
                          ⇠ less
                        </semantic.Button>
                      )
                    }
                  })()}
                  <a onClick={() => store.dispatch(actions.sortBy(retailer))}>
                    {retailer}
                  </a>
                </div>
                </th>
              )
            })
          } else {
            return (
              <th>
                <div className='headerWithButton'>
                  <a>
                    Retailers
                  </a>
                  <semantic.Button
                    basic
                    size='tiny'
                    onClick={() => store.dispatch(actions.toggleSkusExpanded())}
                  >
                    more ...
                  </semantic.Button>
                </div>
              </th>
            )
          }
        })()}
      </tr>
    </thead>
  )
}

function Body({viewState, editing, lines}) {
  return (
    <tbody>
      {lines.map((line, index) => Row({viewState, editing, line, index}))}
    </tbody>
  )
}

const EditInput = React.createClass({
  getInitialState() {
    return {value: this.props.value}
  },
  handleChange(event) {
    //this is to debounce the typing
    this.setState({value: event.target.value})
    clearTimeout(this.timeout)
    this.timeout = setTimeout(function(value) {
      clearTimeout(this.timeout)
      this.props.onChange(value)
    }.bind(this, event.target.value), 2000)
  },
  skipInitialBlur: true,
  handleBlur(event) {
    //this is for firefox where we get an initial blur event on number inputs
    //which we need to ignore
    if (this.skipInitialBlur && this.props.type === 'number') {
      this.skipInitialBlur = false
    } else {
      this.props.onBlur(event.target.value)
    }
  },
  render() {
    return (
      <input
        ref='input'
        spellCheck={false}
        value={this.state.value}
        onChange={this.handleChange}
        onBlur={this.handleBlur}
        type={this.props.type}
      />
    )
  },
  componentDidMount() {
    this.refs.input.focus()
    this.skipInitialBlur = false
    this.refs.input.select()
  },
})

function editingThis(editing, id, field) {
  return editing &&
    immutable.fromJS(editing).equals(immutable.fromJS([id, field]))
}

function EditableCell({editing, line, field}) {
  if (field[0] === 'quantity') {
    var type = 'number'
  }
  const id = line.get('id')
  const value = line.getIn(field)
  const active = editingThis(editing, id, field)
  return (
    <semantic.Table.Cell
      selectable={!!editing}
      active={active}
      onClick={editing ? () => store.dispatch(actions.focus([id, field])) : null}
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
                onChange={value => {
                  store.dispatch(actions.set({id, field, value}))
                }}
                onBlur={value => {
                  store.dispatch(actions.focus([null, null]))
                  store.dispatch(actions.set({id, field, value}))
                }}
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

function Row({viewState, editing, line, index}) {
  const iLine = immutable.fromJS(line)
  return (
    <semantic.Table.Row active={editing[0] === line.id} key={line.id}>
      <td className={`marked ${markerColor(line.reference)}`}>
        <input
          style={{height: 39}}
          onFocus={() => store.dispatch(actions.focus([line.id, null]))}
          onBlur={() => store.dispatch(actions.focus([null, null]))}
          readOnly
        />
      </td>
      <EditableCell editing={editing} line={iLine} field={['reference']}/>
      <EditableCell editing={editing} line={iLine} field={['quantity']}/>
      <EditableCell editing={editing} line={iLine} field={['description']}/>
      {(() => {
        if (viewState.mpnsExpanded) {
          var ps = line.partNumbers
        } else {
          var ps = line.partNumbers.slice(0, 1)
        }
        return ps.map((mpn, i) => {
          const cells = []
          if (viewState.mpnsExpanded) {
            cells.push(
              <EditableCell
                key={`manufacturer-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'manufacturer']}
              />
            )
          }
          cells.push(
              <EditableCell
                key={`part-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'part']}
              />
          )
          return cells
        })
      })()}
      {(() => {
        if (viewState.skusExpanded) {
          return oneClickBom.lineData.retailer_list.map(name => {
            return (
              <EditableCell
                key={`${line.id}-${name}`}
                editing={editing}
                line={iLine}
                field={['retailers', name]}
              />
            )})
        } else if (index === 0) {
          return (
            <td rowSpan={29}>hey</td>
          )
        }
      })()}
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
