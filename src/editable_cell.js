const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const immutable   = require('immutable')

const MpnPopup = require('./mpn_popup').default

const popupFields = ['partNumbers']

const EditableCell = createClass({
  getInitialState() {
    return {triggered: false}
  },
  render() {
    const props = this.props
    const {editing, line, field, setField, setFocus, index, active} = props
    if (field[0] === 'quantity') {
      var type = 'number'
    }
    const value = line.getIn(field)
    const popupTriggerId = `trigger-${line.get('id')}-${field.join('-')}`
    const popupCell = popupFields.includes(field[0])
    let editInput = value
    if (active) {
      editInput = (
        <EditInput
          onMount={() => {
            if (popupCell) {
              //this is a workaround due to bug in controlled popups in
              //semantic-ui-react
              //https://github.com/Semantic-Org/Semantic-UI-React/issues/1065
              this.immediate = setImmediate(() => {
                if (!this.triggered) {
                  const trigger = document.getElementById(popupTriggerId)
                  if (trigger) {
                    trigger.click()
                  }
                }
              })
            }
          }}
          onUnmount={() => {
            clearImmediate(this.immediate)
          }}
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
      )
    }
    const cell = (
      <semantic.Table.Cell
        selectable={!!editing}
        active={active}
        onClick={e => {
          setFocus([index, field])
          if (popupCell) {
            this.triggered = true
            setImmediate(() => this.tiggered = false)
          }
        }}
        style={{maxWidth: active ? '' : 200}}
        id={popupTriggerId}
      >
        <a style={{maxWidth: active ? '' : 200}}>
          {editInput}
          {/* here to make sure the cell grows with the content */}
          <div key='div' style={{visibility: 'hidden', height: 0}}>{value}</div>
        </a>
      </semantic.Table.Cell>
    )
    if (popupCell) {
      const suggestion = props.suggestions ? props.suggestions.first() : null
      return (
        <MpnPopup
          on='click'
          trigger={cell}
          line={line}
          field={field}
          index={index}
          position='bottom center'
        />
      )
    }
    return cell
  }
})

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
    const input = (
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
    return input
  },
  componentWillUnmount() {
    this.props.onUnmount()
  },
  componentDidMount() {
    this.props.onMount()
    this.refs.input.focus()
    this.skipInitialBlur = false
    this.refs.input.select()
  },
})

module.exports = EditableCell
