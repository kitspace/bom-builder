const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const oneClickBom = require('1-click-bom')
const immutable = require('immutable')
const reactRedux  = require('react-redux')
const redux       = require('redux')

const {actions} = require('./state')
const EditableCell = require('./editable_cell')
const Handle = require('./handle')

function editingThis(editing, index, field) {
  return editing && editing.equals(immutable.fromJS([index, field]))
}

function Line(props) {
  const {
    viewState,
    editing,
    line,
    index,
    lineId,
    suggestions,
  } = props
  const id = lineId
  const partNumbersExpanded = viewState.get('partNumbersExpanded')
  return (
    <semantic.Table.Row
      active={editing && editing.get(0) === index}
      key={line.get('id')}
    >
      <Handle index={index} />
      <EditableCell
        setField={props.setField}
        setFocus={props.setFocus}
        editing={editing}
        line={line}
        field={['reference']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
        active={editingThis(editing, index, ['reference'])}
      />
      <EditableCell
        setField={props.setField}
        setFocus={props.setFocus}
        editing={editing}
        line={line}
        field={['quantity']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
        active={editingThis(editing, index, ['quantity'])}
      />
      <EditableCell
        setField={props.setField}
        setFocus={props.setFocus}
        editing={editing}
        line={line}
        field={['description']}
        loseFocus={props.loseFocus}
        setFocusNext={props.setFocusNext}
        setFocusBelow={props.setFocusBelow}
        index={index}
        active={editingThis(editing, index, ['description'])}
      />
      {(() => {
        const ps = line.get('partNumbers')
        return ps.map((mpn, i) => {
          const cells = []
          if (partNumbersExpanded.get(i)) {
            const field = ['partNumbers', i, 'manufacturer']
            cells.push(
              <EditableCell
                key={`manufacturer-${i}`}
                editing={editing}
                line={line}
                field={field}
                setField={props.setField}
                setFocus={props.setFocus}
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
                index={index}
                active={editingThis(editing, index, field)}
              />
            )
          }
          const field = ['partNumbers', i, 'part']
          cells.push(
              <EditableCell
                key={`part-${i}`}
                editing={editing}
                line={line}
                field={field}
                setField={props.setField}
                setFocus={props.setFocus}
                loseFocus={props.loseFocus}
                setFocusNext={props.setFocusNext}
                setFocusBelow={props.setFocusBelow}
                index={index}
                active={editingThis(editing, index, field)}
                expanded={partNumbersExpanded.get(i)}
              />
          )
          return cells
        })
      })()}
      {(() => {
        return oneClickBom.lineData.retailer_list.map((name, i) => {
          const field = ['retailers', name]
          return (
            <EditableCell
              key={name}
              editing={editing}
              line={line}
              field={field}
              setField={props.setField}
              setFocus={props.setFocus}
              loseFocus={props.loseFocus}
              setFocusNext={props.setFocusNext}
              setFocusBelow={props.setFocusBelow}
              index={index}
              active={editingThis(editing, index, field)}
            />
          )})
      })()}
    </semantic.Table.Row>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state, props) {
  return {
    line: state.data.present.getIn(['lines', props.index]),
    viewState: state.view,
    editing: state.view.get('editable') ? state.view.get('focus') : null,
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Line)
