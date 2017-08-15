import './mpn_popup.css'

const React       = require('react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const ramda       = require('ramda')
const immutable   = require('immutable')

const {actions} = require('./state')


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
  getInitialState() {
    return {
      expanded: false,
      viewing: this.props.selected === -1 ? 0 : this.props.selected,
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
  render() {
    const props  = this.props
    const suggestions = props.suggestions
    const part   = suggestions.get(this.state.viewing) || immutable.Map()
    const image  = part.get('image') || immutable.Map()
    const mpn    = part.get('mpn') || immutable.Map()
    const number = mpn.get('part')
    let specs    = reorder(part.get('specs') || [])
    if (! this.state.expanded) {
      specs = specs.slice(0, 4)
    }
    const mpnTitle = (
      <div className='mpnTitle'>
        <div>
          {mpn.get('manufacturer')}
        </div>
        <div>
          {number}
        </div>
      </div>
    )
    const specTableData = specs.map(spec => [spec.get('name'), spec.get('value')])
    const specTable = (
      <semantic.Table
        className='specTable'
        basic='very'
        compact={true}
        tableData={specTableData}
        renderBodyRow={args => {
          return (
            <semantic.Table.Row key={String(args)}>
              {args.map(text => (
                <semantic.Table.Cell key={text}>
                  {text}
                </semantic.Table.Cell>
              ))}
            </semantic.Table.Row>
          )
        }}
      />
    )
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
      <semantic.Popup
        className       = 'MpnPopup'
        hoverable       = {true}
        mouseLeaveDelay = {200}
        mouseEnterDelay = {200}
        position        = {props.position}
        trigger         = {props.trigger}
        onOpen          = {props.onOpen}
        onClose         = {props.onClose}
        flowing         = {true}
        open            = {props.open}
        offset          = {props.offset}
        on              = {props.on}
      >
        <semantic.Button.Group basic fluid>
          <semantic.Button
            disabled={suggestions.size < 2}
            icon='left chevron'
            onClick={this.decrementViewing}
          />
          {(() => {
            if (props.selected === this.state.viewing) {
              return (
                <semantic.Button
                  disabled={!suggestions.size}
                >
                  <semantic.Icon name='checkmark box' />
                  Selected
                  <div style={{marginTop: 5}}>
                    {`${this.state.viewing + 1}/${suggestions.size}`}
                  </div>
                </semantic.Button>
              )
            }
            return (
              <semantic.Button
                disabled={!suggestions.size}
              >
                <semantic.Icon name='square outline' />
                Select
                <div style={{marginTop: 5}}>
                  {`${this.state.viewing + 1}/${suggestions.size}`}
                </div>
              </semantic.Button>
            )
          })()}
          <semantic.Button
            disabled={suggestions.size < 2}
            icon='right chevron'
            onClick={this.incrementViewing}
          />
        </semantic.Button.Group>
        {mpnTitle}
        {(() => {
          if (suggestions.size === 0) {
            return (
              <div className='sorryText'>
                Sorry, could not find any part suggestions for this line.
                Please try adding more information.
              </div>
            )
          }
          return (
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
          )
        })()}
      </semantic.Popup>
    )
  },
})

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state, ownProps) {
  const {field, line} = ownProps
  let suggestions = immutable.Seq()
  let selected = -1
  if (line && field) {
    const mpn = line.getIn(field.slice(0, 2))
    suggestions = state.suggestions.get(line.get('id')) || immutable.List()
    selected = suggestions.findIndex(s => s.get('mpn').equals(mpn))
  }
  return {
    selected,
    suggestions,
  }
}

const ConnectedMpnPopup = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(MpnPopup)

export default ConnectedMpnPopup
