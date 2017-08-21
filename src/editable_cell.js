const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const immutable   = require('immutable')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const reselect    = require('reselect')

const {actions} = require('./state')
const MpnPopup  = require('./mpn_popup').default
const selectors = require('./selectors')

const popupFields = ['partNumbers']

const EditableCell = createClass({
  displayName: 'EditableCell',
  getInitialState() {
    return {triggered: false}
  },
  render() {
    const props = this.props
    const {editing, line, lineId, field, setField, setFocus, active} = props
    if (field.get(0) === 'quantity') {
      var type = 'number'
    }
    const value = line.getIn(field)
    const popupTriggerId = `trigger-${lineId}-${field.join('-')}`
    const popupCell = popupFields.includes(field.get(0))
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
          setField={value => setField({lineId, field, value})}
          value={value}
          type={type}
          key='EditInput'
          setFocusNext={props.setFocusNext}
          loseFocus={() => {
            setTimeout(() => {
              props.loseFocus([lineId, field])
            }, 100)
          }}
          setFocusBelow={props.setFocusBelow}
        />
      )
    }
    if (!props.expanded && field.get(0) === 'partNumbers' && field.get(2) === 'part') {
      var smallField = line.getIn(['partNumbers', field.get(1), 'manufacturer'])
    }
    const cell = (
      <Cell
        selectable={!!editing}
        active={active}
        onClick={e => {
          setFocus([lineId, field])
          if (popupCell) {
            this.triggered = true
            setImmediate(() => this.tiggered = false)
          }
        }}
        popupTriggerId={popupTriggerId}
        smallField={smallField}
        value={value}
        contents={editInput}
        wand={props.wand}
      />
    )
    if (popupCell && (props.wand || props.selected > -1)) {
      return (
        <MpnPopup
          on='click'
          trigger={cell}
          field={field}
          lineId={props.lineId}
          position='bottom center'
          suggestions={props.suggestions}
          selected={props.selected}
        />
      )
    }
    return cell
  }
})

class Cell extends React.PureComponent {
  render() {
    const props = this.props
    const smallField = props.smallField ?
       (<div className='manufacturerSmall'>{props.smallField}</div>) : null
    if (!props.active && props.wand) {
      const color = props.wand === 'match' ? 'green' : 'grey'
      const opacity = props.wand === 'match' ? 1.0 : 0.3
      var icon = (
        <semantic.Icon
          style={{opacity}}
          size='large'
          color={color}
          name='magic'
        />
      )
    }
    return (
      <semantic.Table.Cell
        selectable={props.selectable}
        active={props.active}
        style={{maxWidth: props.active ? '' : 200}}
        id={props.popupTriggerId}
        onClick={props.onClick}
      >
        <a style={{maxWidth: props.active ? '' : 200}}>
          {smallField}
          {icon}
          {props.contents}
          {/* here to make sure the cell grows with the content */}
          <div key='div' style={{visibility: 'hidden', height: 0}}>{props.value}</div>
        </a>
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
      initialValue: props.value,
      untouchedValue: props.value,
    }
  }
  handleChange(event) {
    //this is to debounce the typing
    this.setState({value: event.target.value})
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.save(this.state.value)
    }, 500)
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
    this.props.setField(value)
  }
  componentWillReceiveProps(newProps) {
    if (this.props.type !== 'number') {
      if (newProps.value !== this.state.initialValue) {
        clearTimeout(this.timeout)
        this.setState({
          value: newProps.value,
        })
      }
    }
  }
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
  }
  componentWillUnmount() {
    this.props.onUnmount()
  }
  componentDidMount() {
    this.props.onMount()
    this.refs.input.focus()
    this.skipInitialBlur = false
    this.refs.input.select()
  }
}

function editingThis(editing, lineId, field) {
  return editing && editing.equals(immutable.fromJS([lineId, field]))
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function lineIdSelector(_, props) {
  return props.lineId
}

function fieldSelector(_, props) {
  return props.field
}

function makeActiveSelector() {
  return reselect.createSelector(
    [editingSelector, lineIdSelector, fieldSelector],
    editingThis
  )
}

function makeEditingSelector() {
  return reselect.createSelector(
    [editingSelector],
    editing => editing
  )
}

function parentField(_, props) {
  return props.field.pop()
}

const mpnSelector = reselect.createSelector(
  [selectors.line, parentField],
  (line, field) => line.getIn(field)
)

const partNumbersSelector = reselect.createSelector(
  [selectors.line],
  line => line.get('partNumbers')
)

const otherMpnsSelector = reselect.createSelector(
  [partNumbersSelector, mpnSelector],
  (partNumbers, mpn) => partNumbers.filter(m => !m.equals(mpn))
)

function makeEmptyMpnsSelector() {
  return reselect.createSelector(
    [partNumbersSelector],
    partNumbers => partNumbers.map((m, index) => {
      if(!m.get('part') || !m.get('manufacturer')) {
        return index
      }
      return null
    }).filter(x => x != null)
  )
}

function makeLineSelector() {
  return reselect.createSelector(
    [selectors.line], line => line
  )
}

function makeSuggestionNumberSelector() {
  const emptyPartNumbers = makeEmptyMpnsSelector()
  return reselect.createSelector(
    [emptyPartNumbers, partNumberIndexSelector],
    (empty, partIndex) => {
      return empty.indexOf(partIndex)
    }
  )
}

function makeApplicableSuggestions() {
  return reselect.createSelector(
    [selectors.suggestions, otherMpnsSelector, lineIdSelector],
    (suggestions, otherMpns, lineId, suggestionNumber) => {
      suggestions = suggestions.get(lineId) || immutable.List()
      return suggestions.filter(s => !otherMpns.includes(s.get('mpn')))
    }
  )
}

function makeWandSelector(applicableSuggestionsSelector) {
  const suggestionNumber = makeSuggestionNumberSelector()
  return reselect.createSelector(
    [applicableSuggestionsSelector, suggestionNumber],
    (suggestions, suggestionNumber) => {
      if (suggestionNumber < 0) {
        return false
      }
      const suggestion = suggestions.slice(suggestionNumber).first()
      if (suggestion) {
        return suggestion.get('type')
      }
      return false
    }
  )
}

function partNumberIndexSelector(_, props) {
  return props.partNumberIndex
}

function makeSelectedSelector(suggestions) {
  return reselect.createSelector(
    [suggestions, mpnSelector],
    (suggestions, mpn) => suggestions.findIndex(s => s.get('mpn').equals(mpn))
  )
}

function mapStateToProps() {
  const active      = makeActiveSelector()
  const line        = makeLineSelector()
  const editing     = makeEditingSelector()
  const suggestions = makeApplicableSuggestions()
  const wand        = makeWandSelector(suggestions)
  const selected    = makeSelectedSelector(suggestions)
  return reselect.createSelector(
    [line, editing, active, suggestions, wand, selected],
    (line, editing, active, suggestions, wand, selected) => ({
      line, editing, active, suggestions, wand, selected
    })
  )
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(EditableCell)
