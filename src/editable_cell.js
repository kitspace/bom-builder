const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const immutable   = require('immutable')

function EditableCell(props) {
  const {editing, line, field, setField, setFocus, index} = props
  if (field[0] === 'quantity') {
    var type = 'number'
  }
  const value = line.getIn(field)
  const active = editingThis(editing, index, field)
  return (
    <semantic.Table.Cell
      selectable={!!editing}
      active={active}
      onClick={editing ? () => setFocus([index, field]) : null}
      style={{maxWidth: active ? '' : 200}}
    >
      <a style={{maxWidth: active ? '' : 200}}>
        {(() => {
          if (active) {
            return (
              [
              <EditInput
                setField={value => setField({index, field, value})}
                value={value}
                type={type}
                key='EditInput'
                setFocusNext={props.setFocusNext}
                loseFocus={() => {
                  setTimeout(() => {
                    props.loseFocus([index, field])
                  }, 100)
                }}
                setFocusBelow={props.setFocusBelow}
              />
              ,
              //here to make sure the cell grows with the content
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

function editingThis(editing, index, field) {
  return editing &&
    immutable.fromJS(editing).equals(immutable.fromJS([index, field]))
}

const EditInput = createClass({
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
      this.props.loseFocus()
    }
  },
  save(value) {
    clearTimeout(this.timeout)
    this.props.setField(value)
  },
  componentWillReceiveProps(newProps) {
    if (this.props.type !== 'number') {
      if (newProps.value !== this.state.initialValue) {
        clearTimeout(this.timeout)
        this.setState({
          value: newProps.value,
        })
      }
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

module.exports = EditableCell
