const React       = require('react')
const createClass = require('create-react-class')
const semantic    = require('semantic-ui-react')
const oneClickBom = require('1-click-bom')

const EditableCell = require('./editable_cell')

function Line(props) {
  const {
    viewState,
    editing,
    line,
    index,
  } = props
  return (
    <semantic.Table.Row active={editing && editing.get(0) === index} key={line.get('id')}>
      <Handle
        line={line}
        setField={props.setField}
        setFocus={props.setFocus}
        removeLine={props.removeLine}
        index={index}
        loseFocus={props.loseFocus}
      />
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
      />
      {(() => {
        if (viewState.get('partNumbersExpanded')) {
          return (
            <td
              className='collapserCell'
              onClick={() => props.togglePartNumbersExpanded()}
            >
              ⇠ hide
            </td>
          )
        }
      })()}
      {(() => {
        const ps = viewState.get('partNumbersExpanded') ?
          line.get('partNumbers') : line.get('partNumbers').slice(0, 1)
        return ps.map((mpn, i) => {
          const cells = []
          if (viewState.get('partNumbersExpanded')) {
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
            />
          )})
      })()}
    </semantic.Table.Row>
  )
}

const Handle = createClass({
  render() {
    const {line, setFocus, removeLine, index} = this.props
    return (
      <td className={`marked ${markerColor(line.get('reference'))}`}>
        <input
          ref="input"
          style={{height: 39}}
          onFocus={() => setFocus([index, null])}
          onBlur={() => {
            setTimeout(() => {
              this.props.loseFocus([index, null])
            }, 100)
          }}
          className='mousetrap'
          readOnly
          onKeyDown={e => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              this.setState({keys: []})
              removeLine(index)
            } else if (e.key === 'Escape') {
              this.setState({keys: []})
              this.props.loseFocus([index, null])
            }
          }}
        />
      </td>
    )
  },
})

function markerColor(ref) {
  if (/^C\d/.test(ref)) {
    return 'orange'
  }
  if (/^R\d/.test(ref)) {
    return 'lightblue'
  }
  if (/^IC\d/.test(ref) || /^U\d/.test(ref)) {
    return 'blue'
  }
  if (/^L\d/.test(ref)) {
    return 'black'
  }
  if (/^D\d/.test(ref)) {
    return 'green'
  }
  if (/^LED\d/.test(ref)) {
    return 'yellow'
  }
  return 'purple'
}

module.exports = Line
