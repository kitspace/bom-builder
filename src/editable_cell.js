import React from 'react'
import createClass from 'create-react-class'
import * as semantic from 'semantic-ui-react'

const EditableCell = createClass({
  displayName: 'EditableCell',
  setFieldHandler(value) {
    const {lineId, field, setField} = this.props
    setField({lineId, field, value})
  },
  loseFocusCallback() {
    const {lineId, field, loseFocus} = this.props
    loseFocus([lineId, field])
  },
  loseFocusHandler() {
    //give it some time so we can get to the delete button before losing focus
    setTimeout(this.loseFocusCallback, 300)
  },
  clickHandler(e) {
    const {lineId, field, setFocus, onClick} = this.props
    setFocus([lineId, field])
    onClick && onClick(e)
  },
  render() {
    const props = this.props
    const {editing, value, field, active} = props
    if (field.get(0) === 'quantity') {
      var type = 'number'
    }
    let editInput = value
    if (active) {
      editInput = (
        <EditInput
          value={value}
          type={type}
          setField={this.setFieldHandler}
          loseFocus={this.loseFocusHandler}
          setFocusNext={props.setFocusNext}
          setFocusBelow={props.setFocusBelow}
        />
      )
    }
    return (
      <Cell
        selectable={!!editing}
        active={active}
        value={value}
        contents={editInput}
        smallField={props.smallField}
        wand={props.wand}
        check={props.check}
        onClick={this.clickHandler}
      />
    )
  }
})

class Cell extends React.PureComponent {
  render() {
    const props = this.props
    const smallField = props.smallField ? (
      <div className="smallField">{props.smallField}</div>
    ) : null
    const icons = []
    if (!props.active) {
      if (props.wand) {
        if (props.wand === 'loading') {
          icons.push(<semantic.Loader key="magic" active inline size="mini" />)
        } else {
          const color = props.wand === 'match' ? 'green' : 'grey'
          const wandOpacity = props.wand === 'match' ? 1.0 : 0.3
          icons.push(
            <semantic.Icon
              style={{opacity: wandOpacity, fontSize:'1.2em'}}
              color={color}
              name="magic"
              key="magic"
            />
          )
        }
      }
      if (props.check) {
        const checkOpacity = props.check === 'grey' ? 0.3 : 1.0
        icons.push(
          <semantic.Icon
            style={{opacity: checkOpacity}}
            name={props.check === 'red' ? 'close' : 'check'}
            key="check"
            color={props.check}
          />
        )
      }
    }
    return (
      <semantic.Table.Cell
        selectable={props.selectable}
        active={props.active}
        style={{maxWidth: props.active ? '' : 100, minWidth: 50}}
        onClick={props.onClick}
      >
        <div>
          {smallField}
          {icons}
          {props.contents}
          {/* here to make sure the cell grows with the content */}
          <div key="div" style={{visibility: 'hidden', height: 0}}>
            {props.value}
          </div>
        </div>
      </semantic.Table.Cell>
    )
  }
}

class EditInput extends React.PureComponent {
  constructor(props) {
    super(props)
    this.skipInitialBlur = true
    this.handleBlur = this.handleBlur.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.save = this.save.bind(this)
    this.state = {
      value: props.value,
      initialValue: props.value
    }
  }
  handleChange(event) {
    //this is to debounce the typing
    this.setState({value: event.target.value})
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.save(this.state.value)
    }, 5000)
  }
  handleBlur(event) {
    //this is for firefox where we get an initial blur event on number inputs
    //which we need to ignore
    if (this.skipInitialBlur && this.props.type === 'number') {
      this.skipInitialBlur = false
    } else {
      this.save(this.state.value)
      this.props.loseFocus()
    }
  }
  save(value) {
    clearTimeout(this.timeout)
    if (this.state.initialValue !== value) {
      this.props.setField(value)
      /* global _paq */
      if (typeof _paq !== 'undefined') {
        _paq.push([
          'trackSiteSearch',
          // Search keyword searched for
          this.state.value,
          // Search category selected in your search engine. If you do not need
          //this, set to false
          'BOM Builder',
          // Number of results on the Search results page. Zero indicates a 'No
          // Result Search Keyword'. Set to false if you don't know
          false
        ])
      }
    }
  }
  UNSAFE_componentWillReceiveProps(newProps) {
    if (this.props.type !== 'number') {
      if (newProps.value !== this.state.initialValue) {
        clearTimeout(this.timeout)
        this.setState({
          value: newProps.value
        })
      }
    }
  }
  render() {
    const input = (
      <input
        ref="input"
        spellCheck={false}
        value={this.state.value}
        onChange={this.handleChange}
        onBlur={this.handleBlur}
        type={this.props.type}
        //needed for grabbing shortcuts while editing
        className="mousetrap"
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
  }
  componentWillUnmount() {
    this.props.onUnmount && this.props.onUnmount()
  }
  componentDidMount() {
    this.props.onMount && this.props.onMount()
    this.refs.input.focus()
    this.skipInitialBlur = false
    this.refs.input.select()
  }
}

export default EditableCell
