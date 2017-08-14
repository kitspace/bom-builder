import './mpn_popup.css'

const React       = require('react')
const createClass = require('create-react-class')
const {h, a, div} = require('react-hyperscript-helpers')
const semantic    = require('semantic-ui-react')
const ramda       = require('ramda')
const immutable   = require('immutable')


const importance = [
  ['color', 'capacitance', 'resistance'],
  ['case_package'],
  ['dielectric_characteristic'],
  ['resistance_tolerance', 'capacitance_tolerance'],
  ['voltage_rating', 'power_rating'],
  ['pin_count'],
  ['case_package_si'],
]

function chunkArray(arr, chunkSize) {
    var groups = [], i;
    for (i = 0; i < arr.length; i += chunkSize) {
        groups.push(arr.slice(i, i + chunkSize));
    }
    return groups;
}

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

function specRow(spec) {
  return h(semantic.Table.Row, [
    h(semantic.Table.Cell, spec.name),
    h(semantic.Table.Cell, spec.value),
  ])
}

const MpnPopup = createClass({
  getInitialState() {
    return {expanded: false}
  },
  toggleExpanded() {
    this.setState({expanded: !this.state.expanded})
  },
  render() {
    const props = this.props
    const custom = {
      className       : 'MpnPopup',
      hoverable       : true,
      mouseLeaveDelay : 200,
      mouseEnterDelay : 200,
      position        : props.position,
      trigger         : props.trigger,
      onOpen          : props.onOpen,
      onClose         : props.onClose,
      flowing         : true,
      open            : props.open,
      offset          : props.offset,
      on              : props.on,
    }
    const part = props.part
    if (!part) {
      return h(semantic.Popup, custom, 'Sorry, no further part information found.')
    }
    const image  = part.get('image') || immutable.Map()
    const mpn    = part.get('mpn') || immutable.Map()
    const number = mpn.get('part')
    let specs    = reorder(part.get('specs') || [])
    if (! this.state.expanded) {
      specs = specs.slice(0, 4)
    }
    const tableData = specs.map(spec => [spec.get('name'), spec.get('value')])
    const table = h(semantic.Table, {
        basic   : 'very',
        compact : true,
        tableData,
        renderBodyRow(args) {
          return h(semantic.Table.Row, {key: String(args)}, args.map(text => {
            return h(semantic.Table.Cell, text)
          }))
        },
    })
    let button
    if (part.get('specs') && part.get('specs').size > 4) {
      button = h(div, {style:{display: 'flex', justifyContent: 'center'}}, [
        h(semantic.Button, {
          onClick : this.toggleExpanded,
          size    : 'tiny',
          basic   : true,
        }, this.state.expanded ? '⇡' : '...'),
      ])
    }
    return h(semantic.Popup, custom, [
      div({className: 'topAreaContainer'}, [
        h(div, {style:{display: 'flex', alignItems: 'center', padding: 10}}, [h(semantic.Button, {basic: true, icon:'left arrow'})]),
        h(div, {style:{display: 'flex', flexDirection:'column', justifyContent: 'space-between'}}, [
          div({style: {width: '100%',  display: 'flex', justifyContent: 'space-around', marginBottom: 10}}, [
            h(semantic.Button, {primary: true}, [
              semantic.Icon({name: 'square outline',}),
              'Select',
            ])
          ]),
          div([
            div({className: 'imageContainer'}, [
              h(semantic.Image, {src: image.get('url')}),
            ]),
            a({style:{fontSize:9}, href: image.get('credit_url')}, image.get('credit_string')),
          ]),
          h(div, {style:{display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start'}}, [
            a({style:{fontSize: 10}, href: number ? `https://octopart.com/search?q=${number}` : 'https://octopart.com/'}, 'Powered by Octopart'),
          ]),
        ]),
        div({style:{marginLeft: 20}}, [
          div({style: {maxWidth: 200}}, part.get('description') ),
          div({style: {marginTop: 15, display:'flex', justifyContent: 'center'}}, [
            a({href: part.get('datasheet')}, [
              h(semantic.Icon, {name: 'file pdf outline'}),
              'Datasheet'
            ])
          ]),
          table,
          button,
        ]),
        h(div, {style:{display: 'flex', alignItems: 'center', padding: 10}}, [h(semantic.Button, {basic: true, icon:'right arrow'})]),
      ]),
    ])
  },
})

export default MpnPopup
