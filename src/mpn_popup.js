import './mpn_popup.css'

const React       = require('react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const ramda       = require('ramda')
const immutable   = require('immutable')
const reselect    = require('reselect')

const {actions} = require('./state')
const selectors = require('./selectors')

const importance = [
  ['color', 'capacitance', 'resistance'],
  ['case_package'],
  ['dielectric_characteristic'],
  ['resistance_tolerance', 'capacitance_tolerance'],
  ['voltage_rating', 'power_rating'],
  ['pin_count'],
  ['case_package_si'],
]

function reorder(specs) {
  const groups = specs.reduce((acc, spec) => {
    let index = importance.reduce((prev, keys, index) => {
      if (keys.indexOf(spec.key) >= 0) {
        return index
      }
      return prev
    }, null)
    if (index == null) {
      index = acc.length - 1
    }
    acc[index].push(spec)
    return acc
  }, importance.map(x => []).concat([[]]))
  return ramda.flatten(groups)
}

const MpnPopup = createClass({
  displayName:'MpnPopup',
  getInitialState() {
    const viewing = this.props.selected < 0 ? 0 : this.props.selected
    return {
      expanded: false,
      viewing,
      initialViewing: viewing,
    }
  },
  componentWillReceiveProps(newProps) {
    if (newProps.selected !== this.props.selected
    && this.state.viewing === this.state.initialViewing) {
      this.setViewing(newProps.selected)
    }
  },
  toggleExpanded() {
    this.setState({expanded: !this.state.expanded})
  },
  incrementViewing() {
    this.setViewing(this.state.viewing + 1)
  },
  decrementViewing() {
    this.setViewing(this.state.viewing - 1)
  },
  setViewing(n) {
    const suggestions = this.props.suggestions
    if (n >= suggestions.size) {
      n = 0
    } else if (n < 0) {
      if (suggestions.size === 0) {
        n = 0
      } else {
        n = suggestions.size - 1
      }
    }
    this.setState({viewing: n})
  },
  toggleSelected() {
    const {
      index,
      selected,
      remove,
      setState,
      selectPartNumberSuggestion,
      suggestions,
    } = this.props
    //set the entire mpn field i.e.
    //part -> {manufacturer, part}
    const field = this.props.field.slice(0, 2)
    if (selected === this.state.viewing) {
      remove(immutable.List.of(index, field))
    } else {
      const mpn = suggestions.getIn([this.state.viewing, 'mpn'])
      selectPartNumberSuggestion({index, value: mpn})
    }
  },
  render() {
    const props = this.props
    const suggestions = props.suggestions
    const popupProps = {
        className       : 'MpnPopup',
        flowing         : true,
        position        : props.position,
        trigger         : props.trigger,
        onOpen          : props.onOpen,
        onClose         : props.onClose,
        open            : props.open,
        offset          : props.offset,
        on              : props.on,
    }
    if (suggestions.size === 0) {
      return (
        <semantic.Popup {...popupProps}>
          <div className='sorryText'>
            Sorry, could not find any more part suggestions for this line.
            Please try adding more information.
          </div>
        </semantic.Popup>
      )
    }
    const part   = suggestions.get(this.state.viewing) || immutable.Map()
    const image  = part.get('image') || immutable.Map()
    const mpn    = part.get('mpn') || immutable.Map()
    const number = mpn.get('part')
    let specs    = reorder(part.get('specs') || [])
    if (! this.state.expanded) {
      specs = specs.slice(0, 4)
    }
    const mpnTitle = (
      <Title
        one={mpn.get('manufacturer')}
        two={number}
        page={`${this.state.viewing + 1}/${suggestions.size}`}
      />
    )
    const specTable = <SpecTable specs={specs} />
    let expandButton
    if (part.get('specs') && part.get('specs').size > 4) {
      expandButton = (
        <div className='expandButtonContainer'>
          <semantic.Button
            onClick = {this.toggleExpanded}
            size    = 'tiny'
            basic   = {true}
          >
            {this.state.expanded ? '⇡' : '...'}
          </semantic.Button>
        </div>
      )
    }
    return (
      <semantic.Popup {...popupProps} >
        <Buttons
          disabled={suggestions.size < 2}
          selected={this.props.selected === this.state.viewing}
          onIncrement={this.incrementViewing}
          onDecrement={this.decrementViewing}
          onSelect={this.toggleSelected}
        />
        {mpnTitle}
        <div className='topAreaContainer'>
          <div className='topAreaInner'>
            <div>
              <div className='imageContainer'>
                <semantic.Image src={image.get('url')} />
              </div>
              <a className='imageCredit' href={image.get('credit_url')}>
                {image.get('credit_string')}
              </a>
            </div>
            <div className='octopartLinkContainer'>
              <a
                href={
                  'https://octopart.com' +
                  (number ? `/search?q=${number}` : '')
                }
              >
                Powered by Octopart
              </a>
            </div>
          </div>
          <div className='rightHandModule'>
            <div className='description'>
              {part.get('description')}
            </div>
            <div className='datasheet'>
              <a href={part.get('datasheet')}>
                <semantic.Icon name='file pdf outline' />
                Datasheet
              </a>
            </div>
            {specTable}
            {expandButton}
          </div>
        </div>
      </semantic.Popup>
    )
  },
})

class SpecTable extends React.PureComponent {
  render() {
    const specTableData = this.props.specs.map(spec => (
      [spec.get('name'), spec.get('value')]
    ))
    return (
      <semantic.Table
        className='specTable'
        basic='very'
        compact={true}
        tableData={specTableData}
        renderBodyRow={args => {
          return (
            <tr key={String(args)}>
              {args.map(text => (
                <td key={text}>
                  {text}
                </td>
              ))}
            </tr>
          )
        }}
      />
    )
  }
}

class Title extends React.PureComponent {
  render() {
    const props = this.props
    return (
      <div className='titleContainer'>
        <div />
        <div className='mpnTitle'>
          <div>
            {props.one}
          </div>
          <div>
            {props.two}
          </div>
        </div>
        <div className='viewingNumber'>
          {props.page}
        </div>
      </div>
    )
  }
}

class Buttons extends React.PureComponent {
  render() {
    const {disabled, selected, onDecrement, onIncrement, onSelect} = this.props
    return (
      <semantic.Button.Group basic fluid>
        <semantic.Button
          disabled={disabled}
          icon='left chevron'
          onClick={onDecrement}
        />
        <semantic.Button onClick={onSelect}>
          <semantic.Icon
            name={selected ? 'checkmark box' : 'square outline'}
          />
          {selected ? 'Selected' : 'Select'}
        </semantic.Button>
        <semantic.Button
          disabled={disabled}
          icon='right chevron'
          onClick={onIncrement}
        />
      </semantic.Button.Group>
    )
  }
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mpnSelector(state, props) {
  const line = selectors.line(state, props)
  return line.getIn(props.field.slice(0, 2))
}


const partNumbersSelector = reselect.createSelector(
  [selectors.line],
  line => line.get('partNumbers')
)

const otherMpnsSelector = reselect.createSelector(
  [partNumbersSelector, mpnSelector],
  (partNumbers, mpn) => partNumbers.filter(m => !m.equals(mpn))
)

const applicableSuggestionsSelector = reselect.createSelector(
  [selectors.suggestions, otherMpnsSelector, selectors.line],
  (suggestions, otherMpns, line) => {
    suggestions = suggestions.get(line.get('id')) || immutable.List()
    return suggestions.filter(s => !otherMpns.includes(s.get('mpn')))
  }
)

const selectedSelector = reselect.createSelector(
  [applicableSuggestionsSelector, mpnSelector],
  (suggestions, mpn) => suggestions.findIndex(s => s.get('mpn').equals(mpn))
)

function makeGetSuggestions() {
  return reselect.createSelector(
    [applicableSuggestionsSelector, selectedSelector],
    (suggestions, selected) => [suggestions, selected]
  )
}

function makeLineSelector() {
  return reselect.createSelector(
    [selectors.line], line => line
  )
}

function mapStateToProps() {
  const getSuggestions = makeGetSuggestions()
  const getLine = makeLineSelector()
  return (state, props) => {
    const [suggestions, selected] = getSuggestions(state, props)
    return {
      selected,
      suggestions,
      line: getLine(state, props),
    }
  }
}

const ConnectedMpnPopup = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(MpnPopup)

export default ConnectedMpnPopup
