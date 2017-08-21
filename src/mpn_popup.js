import './mpn_popup.css'

const React       = require('react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const immutable   = require('immutable')
const reselect    = require('reselect')

const {actions} = require('./state')
const selectors = require('./selectors')

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
      selected,
      remove,
      setField,
      suggestions,
      lineId
    } = this.props
    //set the entire mpn field i.e.
    //part -> {manufacturer, part}
    const field = this.props.field.pop()
    if (selected === this.state.viewing) {
      remove(immutable.List.of(lineId, field))
    } else {
      const mpn = suggestions.getIn([this.state.viewing, 'mpn'])
      setField({lineId, field, value: mpn})
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
    const part   = suggestions.get(this.state.viewing)
    const image  = part.get('image') || immutable.Map()
    const mpn    = part.get('mpn')
    const number = mpn.get('part')
    let specs    = part.get('specs') || immutable.List()
    if (! this.state.expanded) {
      specs = specs.slice(0, 4)
    }
    const mpnTitle = (
      <Title
        one={mpn.get('manufacturer')}
        two={number}
        page={`${this.state.viewing + 1}/${suggestions.size}`}
        wandColor={part.get('type') === 'match' ? 'green' : 'grey'}
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
            <Datasheet href={part.get('datasheet')} />
            {specTable}
            {expandButton}
          </div>
        </div>
      </semantic.Popup>
    )
  },
})

class Datasheet extends React.PureComponent {
  render() {
    const link = this.props.href ?
      <a href={this.props.href} >
        <semantic.Icon name='file pdf outline' />
        Datasheet
      </a> : null
    return (
      <div className='datasheet'>
        {link}
      </div>
    )
  }
}

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
        tableData={specTableData.toArray()}
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
    const opacity = props.wandColor === 'green' ? 1.0 : 0.3
    return (
      <div className='titleContainer'>
        <div>
          <semantic.Icon
            style={{opacity}}
            size='large'
            color={props.wandColor}
            name='magic'
          />
        </div>
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

function parentField(_, props) {
  return props.field.pop()
}

const mpnSelector = reselect.createSelector(
  [selectors.line, parentField],
  (line, field) => line.getIn(field)
)

function makeLineSelector() {
  return reselect.createSelector(
    [selectors.line], line => line
  )
}

function suggestionsSelector(_, props) {
  return props.suggestions
}

function makeSelectedSelector() {
  return reselect.createSelector(
    [suggestionsSelector, mpnSelector],
    (suggestions, mpn) => suggestions.findIndex(s => s.get('mpn').equals(mpn))
  )
}

function mapStateToProps() {
  const selected = makeSelectedSelector()
  const line = makeLineSelector()
  return reselect.createSelector(
    [selected, line],
    (selected, line) => ({selected, line})
  )
}

const ConnectedMpnPopup = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(MpnPopup)

export default ConnectedMpnPopup
