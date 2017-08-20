const React       = require('react')
const semantic    = require('semantic-ui-react')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')
const reactRedux  = require('react-redux')
const redux       = require('redux')
const reselect    = require('reselect')

const selectors = require('./selectors')
const {actions} = require('./state')
const EditableCell = require('./editable_cell')
const Handle = require('./handle')


//for passing shallow equality
const fields = immutable.Map({
  reference: immutable.List.of('reference'),
  quantity: immutable.List.of('quantity'),
  description: immutable.List.of('description'),
  partNumbers: immutable.Range(0, 100).map(i => (
    immutable.Map({
      part: immutable.List.of('partNumbers', i, 'part'),
      manufacturer: immutable.List.of('partNumbers', i, 'manufacturer'),
    })
  )),
  retailers: immutable.Map(oneClickBom.lineData.retailer_list.map(r => (
    [r, immutable.List.of('retailers', r)]
  ))),
})

function Line(props) {
  const {
    viewState,
    line,
    index,
    editing,
    lineId,
  } = props
  const id = lineId
  const partNumbersExpanded = viewState.get('partNumbersExpanded')
  const ps = line.get('partNumbers')
  const partNumberCells = ps.flatMap((mpn, i) => {
    const cells = []
    if (partNumbersExpanded.get(i)) {
      const get = immutable.List.of('partNumbers', i, 'manufacturer')
      //just in case we have more partNumbers than we prepared in fields
      const field = fields.getIn(get) || get
      cells.push(
        <EditableCell
          key={`manufacturer-${i}`}
          field={field}
          index={index}
          partNumberIndex={i}
        />
      )
    }
    const get = immutable.List.of('partNumbers', i, 'part')
    //just in case we have more partNumbers than we prepared in fields
    const field = fields.getIn(get) || get
    cells.push(
      <EditableCell
        key={`part-${i}`}
        field={field}
        index={index}
        expanded={partNumbersExpanded.get(i)}
        partNumberIndex={i}
      />
    )
    return cells
  })
  const retailerCells = oneClickBom.lineData.retailer_list.map((name, i) => {
    const field = fields.getIn(['retailers', name])
    return (
      <EditableCell
        key={name}
        field={field}
        index={index}
      />
    )
  })
  return (
    <semantic.Table.Row active={editing && editing.get(0) === index}>
      <Handle index={index} />
      <EditableCell
        field={fields.get('reference')}
        index={index}
      />
      <EditableCell
        field={fields.get('quantity')}
        index={index}
      />
      <EditableCell
        field={fields.get('description')}
        index={index}
      />
      {partNumberCells}
      {retailerCells}
    </semantic.Table.Row>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function editingSelector(state) {
  return state.view.get('editable') ? state.view.get('focus') : null
}

function mapStateToProps() {
  return reselect.createSelector(
    [selectors.line, selectors.view, editingSelector],
    (line, viewState, editing) => ({
      line,
      viewState,
      editing,
    })
  )
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Line)
