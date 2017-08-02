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
            this.save(this.state.initialValue)
            this.props.loseFocus()
          } else if (e.key === 'Enter') {
            this.save(this.state.value)
            this.props.setFocusBelow()
          } else if ((e.key === 'z' || e.key === 'y') && e.ctrlKey) {
            e.preventDefault()
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

function editingThis(editing, index, field) {
  return editing &&
    immutable.fromJS(editing).equals(immutable.fromJS([index, field]))
}

function EditableCell(props) {
  const {editing, line, field, setField, setFocus, index} = props
  if (field[0] === 'quantity') {
    var type = 'number'
  }
  const id = line.get('id')
  const value = line.getIn(field)
  const active = editingThis(editing, index, field)
  return (
    <semantic.Table.Cell
      selectable={!!editing}
      active={active}
      onClick={editing ? () => setFocus([index, field]) : null}
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
                setFocusNext={props.setFocusNext}
                loseFocus={() => props.loseFocus([id, field])}
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
  render() {
    const {line, setField, setFocus, removeLine, index} = this.props
    return (
      <td className={`marked ${markerColor(line.reference)}`}>
        <input
          ref="input"
          style={{height: 39}}
          onFocus={() => setFocus([index, null])}
          onBlur={() => {
            setTimeout(() => {
              this.props.loseFocus([index, null])
            }, 100)
          }}
          className='mousetrap'
          readOnly
          onKeyDown={e => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              this.setState({keys: []})
              removeLine(index)
            } else if (e.key === 'Escape') {
              this.setState({keys: []})
              this.props.loseFocus([index, null])
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
    <semantic.Table.Row active={editing && editing[0] === index} key={line.id}>
      <Handle
        line={line}
        setField={setField}
        setFocus={setFocus}
        removeLine={props.removeLine}
        index={index}
        loseFocus={props.loseFocus}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['reference']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['quantity']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
      />
      <EditableCell
        setField={setField}
        setFocus={setFocus}
        editing={editing}
        line={iLine}
        field={['description']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
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
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
                index={index}
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
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
                index={index}
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
              key={name}
              editing={editing}
              line={iLine}
              field={field}
              setField={setField}
              setFocus={setFocus}
              loseFocus={props.loseFocus}
              setFocusNext={props.setFocusNext}
              setFocusBelow={props.setFocusBelow}
              index={index}
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
