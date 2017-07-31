const React       = require('react')
const semantic    = require('semantic-ui-react')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')

const {actions} = require('./state')

function Body(props) {
  const {
    viewState,
    lines,
    setField,
    setFocus,
    togglePartNumbersExpanded
  } = props
  const editing = viewState.editable ? viewState.focus : null
  return (
    <tbody>
      {lines.map((line, index) => Row({
        viewState,
        editing,
        line,
        index,
        lines,
        setField,
        setFocus,
        togglePartNumbersExpanded,
        ...props
      }))}
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

function EditableCell({editing, line, field, setField, setFocus}) {
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
      onClick={editing ? () => setFocus([id, field]) : null}
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
                  setField({id, field, value})
                }}
                onBlur={value => {
                  setFocus([null, null])
                  setField({id, field, value})
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

function Row(props) {
  const {viewState, editing, line, index, lines, setField, setFocus, togglePartNumbersExpanded} = props
  const iLine = immutable.fromJS(line)
  const numberOfRows = lines.length
  const retailers = oneClickBom.lineData.toRetailers(lines)
  return (
    <semantic.Table.Row active={editing && editing[0] === line.id} key={line.id}>
      <td className={`marked ${markerColor(line.reference)}`}>
        <input
          style={{height: 39}}
          onFocus={() => setFocus([line.id, null])}
          onBlur={() => setFocus([null, null])}
          readOnly
          onKeyDown={e => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              props.removeLine(line.id)
            } else if (e.key === 'Escape') {
              setFocus([null, null])
            }
          }}
        />
      </td>
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['reference']}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['quantity']}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['description']}
      />
      {(() => {
        if (viewState.partNumbersExpanded) {
          return (
            <td
              className='collapserCell'
              onClick={() => togglePartNumbersExpanded()}
            >
              ⇠ less
            </td>
          )
        }
      })()}
      {(() => {
        if (viewState.partNumbersExpanded) {
          var ps = line.partNumbers
        } else {
          var ps = line.partNumbers.slice(0, 1)
        }
        return ps.map((mpn, i) => {
          const cells = []
          if (viewState.partNumbersExpanded) {
            cells.push(
              <EditableCell
                key={`manufacturer-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'manufacturer']}
                setField={setField}
                setFocus={setFocus}
              />
            )
          }
          cells.push(
              <EditableCell
                key={`part-${i}`}
                editing={editing}
                line={iLine}
                field={['partNumbers', i, 'part']}
                setField={setField}
                setFocus={setFocus}
              />
          )
          return cells
        })
      })()}
      {(() => {
        return oneClickBom.lineData.retailer_list.map(name => {
          return (
            <EditableCell
              key={`${line.id}-${name}`}
              editing={editing}
              line={iLine}
              field={['retailers', name]}
              setField={setField}
              setFocus={setFocus}
            />
          )})
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

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  return {
    viewState: state.get('view').toJS(),
    lines: state.get('data').get('lines').toJS()
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Body)
