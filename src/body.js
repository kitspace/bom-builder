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
    return {
      value: this.props.value,
      initialValue: this.props.value,
      untouchedValue: this.props.value,
      undone: 0,
    }
  },
  handleChange(event) {
    //this is to debounce the typing
    this.setState({value: event.target.value})
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.save(this.state.value)
    }, 500)
  },
  skipInitialBlur: true,
  handleBlur(event) {
    //this is for firefox where we get an initial blur event on number inputs
    //which we need to ignore
    if (this.skipInitialBlur && this.props.type === 'number') {
      this.skipInitialBlur = false
    } else {
      this.save(this.state.value)
    }
  },
  save(value) {
    clearTimeout(this.timeout)
    this.props.setField(value)
  },
  componentWillReceiveProps(newProps) {
    if (newProps.value !== this.state.initialValue) {
      clearTimeout(this.timeout)
      this.setState({
        value: newProps.value,
        initialValue: newProps.value,
        undone: 0,
      })
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
        className='mousetrap'
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault()
            this.save(this.state.value)
            this.props.setFocusNext()
          } else if (e.key === 'Escape') {
            this.save(this.state.untouchedValue)
            this.props.loseFocus()
          } else if (e.key === 'Enter') {
            this.save(this.state.value)
            this.props.setFocusBelow()
          }
        }}
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

function EditableCell(props) {
  const {editing, line, field, setField, setFocus} = props
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
                setField={value => setField({id, field, value})}
                value={value}
                type={type}
                key='EditInput'
                undo={props.undo}
                redo={props.redo}
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                loseFocus={props.loseFocus}
                setFocusBelow={props.setFocusBelow}
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

const Handle = React.createClass({
  getInitialState() {
    return {
      keys: [],
    }
  },
  render() {
    const {line, setField, setFocus, removeLine, undo, redo} = this.props
    return (
      <td className={`marked ${markerColor(line.reference)}`}>
        <input
          style={{height: 39}}
          onFocus={() => setFocus([line.id, null])}
          onBlur={() => setFocus([null, null])}
          readOnly
          onKeyUp={e => {
            this.setState({keys: this.state.keys.filter(k => k !== e.key)})
          }}
          onKeyDown={e => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              this.setState({keys: []})
              removeLine(line.id)
            } else if (e.key === 'Escape') {
              this.setState({keys: []})
              setFocus([null, null])
            } else {
              const keys = this.state.keys.concat([e.key])
              this.setState({keys})
              if (keys.includes('Control') && keys.includes('z')) {
                undo()
              } else if (keys.includes('Control') && keys.includes('y')) {
                redo()
              }
            }
          }}
        />
      </td>
    )
  },
})

function Row(props) {
  const {viewState, editing, line, index, lines, setField, setFocus, togglePartNumbersExpanded} = props
  const iLine = immutable.fromJS(line)
  const numberOfRows = lines.length
  const retailers = oneClickBom.lineData.toRetailers(lines)
  return (
    <semantic.Table.Row active={editing && editing[0] === line.id} key={line.id}>
      <Handle
        line={line}
        setField={setField}
        setFocus={setFocus}
        removeLine={props.removeLine}
        undo={props.undo}
        redo={props.redo}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['reference']}
        undo={props.undo}
        redo={props.redo}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['quantity']}
        undo={props.undo}
        redo={props.redo}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['description']}
        undo={props.undo}
        redo={props.redo}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
      />
      {(() => {
        if (viewState.partNumbersExpanded) {
          return (
            <td
              className='collapserCell'
              onClick={() => togglePartNumbersExpanded()}
            >
              ⇠ hide
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
            const field = ['partNumbers', i, 'manufacturer']
            cells.push(
              <EditableCell
                key={`manufacturer-${i}`}
                editing={editing}
                line={iLine}
                field={field}
                setField={setField}
                setFocus={setFocus}
                undo={props.undo}
                redo={props.redo}
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
              />
            )
          }
          const field = ['partNumbers', i, 'part']
          cells.push(
              <EditableCell
                key={`part-${i}`}
                editing={editing}
                line={iLine}
                field={field}
                setField={setField}
                setFocus={setFocus}
                undo={props.undo}
                redo={props.redo}
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
              />
          )
          return cells
        })
      })()}
      {(() => {
        return oneClickBom.lineData.retailer_list.map((name, i) => {
          const field = ['retailers', name]
          return (
            <EditableCell
              key={`${line.id}-${name}`}
              editing={editing}
              line={iLine}
              field={field}
              setField={setField}
              setFocus={setFocus}
              undo={props.undo}
              redo={props.redo}
              loseFocus={props.loseFocus}
              setFocusNext={props.setFocusNext}
              setFocusBelow={props.setFocusBelow}
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
    viewState: state.view.toJS(),
    lines: state.data.present.get('lines').toJS()
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Body)
