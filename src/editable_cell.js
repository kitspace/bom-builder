import React from 'react'
import * as semantic from 'semantic-ui-react'

class EditableCell extends React.Component {
  setFieldHandler = value => {
    const {lineId, field, setField} = this.props
    setField({lineId, field, value})
  }
  loseFocusCallback = () => {
    const {lineId, field, loseFocus} = this.props
    loseFocus([lineId, field])
  }
  loseFocusHandler = () => {
    //give it some time so we can get to the delete button before losing focus
    setTimeout(this.loseFocusCallback, 300)
  }
  clickHandler = e => {
    const {lineId, field, setFocus, onClick} = this.props
    setFocus([lineId, field])
    onClick && onClick(e)
  }
  shouldComponentUpdate(newProps) {
    // don't update when 'field' updates as it never actually changes
    return Object.keys(newProps).reduce((prev, k) => {
      return prev || (k !== 'field' && newProps[k] !== this.props[k])
    }, false)
  }
  render() {
    const props = this.props
    let {value, field, active, highlight} = props
    if (field.get(0) === 'quantity') {
      var type = 'number'
      if (this.props.previewBuy && !active) {
        value = Math.ceil(this.props.buyMultiplier * value)
        highlight = 'blue'
      }
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
        active={active}
        value={value}
        contents={editInput}
        smallField={props.smallField}
        match={props.match}
        selectedCheck={props.selectedCheck}
        suggestionCheck={props.suggestionCheck}
        onClick={this.clickHandler}
        colSpan={props.colSpan}
        highlight={highlight}
      />
    )
  }
}

class Cell extends React.PureComponent {
  render() {
    const props = this.props
    const smallField = props.smallField ? (
      <div className="smallField">{props.smallField}</div>
    ) : null
    const icons = []
    if (!props.active && props.highlight !== 'blank') {
      let matchColor
      if (props.match) {
        if (props.match === 'loading') {
          icons.push(<semantic.Loader key="match" active inline size="mini" />)
        } else {
          matchColor = /match/.test(props.match) ? 'green' : 'grey'
          const matchOpacity = /match/.test(props.match) ? 1.0 : 0.3
          icons.push(
            <span key="match">
              <semantic.Popup
                inverted
                size="mini"
                position="bottom right"
                verticalOffset={3}
                horizontalOffset={7}
                trigger={
                  <semantic.Icon
                    style={{opacity: matchOpacity, fontSize: '1.2em'}}
                    color={matchColor}
                    name={props.match === 'match' ? 'clone outline' : 'search'}
                  />
                }
                content={
                  props.match === 'match'
                    ? 'Suggestion that matches an already selected part is available'
                    : matchColor === 'green'
                      ? 'Common Parts Library suggestion available'
                      : 'Search result suggestion available'
                }
              />
            </span>
          )
        }
      }
      if (props.suggestionCheck) {
        icons.push(
          <span key="suggestionCheck">
            <semantic.Popup
              inverted
              size="mini"
              position="bottom right"
              verticalOffset={3}
              horizontalOffset={7}
              trigger={
                <semantic.Icon
                  name={props.suggestionCheck === 'red' ? 'close' : 'check'}
                  color={props.suggestionCheck}
                />
              }
              content={
                props.suggestionCheck === 'red'
                  ? 'Suggestion is out of stock'
                  : props.suggestionCheck === 'orange'
                    ? 'Suggestion does not have enough stock or location is' +
                      ' sub-optimal'
                    : 'Suggestion is in stock'
              }
            />
          </span>
        )
      }
      if (props.selectedCheck) {
        icons.push(
          <span key="selectedCheck">
            <semantic.Popup
              inverted
              size="mini"
              position="bottom right"
              verticalOffset={3}
              horizontalOffset={7}
              trigger={
                <semantic.Icon
                  name={props.selectedCheck === 'red' ? 'close' : 'check'}
                  color={props.selectedCheck}
                />
              }
              content={
                props.selectedCheck === 'red'
                  ? 'Selected part does not exist or is out of stock'
                  : 'Selected part does not have enough stock or stock location' +
                    ' is sub-optimal'
              }
            />
          </span>
        )
      }
    }
    return (
      <div
        className="tableBodyCell"
        selectable={props.selectable}
        active={props.active}
        style={{maxWidth: props.active ? '' : 100, minWidth: 50}}
        onClick={props.onClick}
        className={props.highlight ? 'highlight ' + props.highlight : ''}
        colSpan={props.colSpan}
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
      </div>
    )
  }
}

class EditInput extends React.PureComponent {
  constructor(props, ...args) {
    super(props, ...args)
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
      clearTimeout(this.timeout)
      this.setState({
        value: newProps.value
      })
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
