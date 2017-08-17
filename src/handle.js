const React      = require('react')
const reactRedux = require('react-redux')
const redux      = require('redux')

const {actions} = require('./state')

function Handle(props) {
  const {reference, index, setFocus, removeLine} = props
  return (
    <td className={`marked ${markerColor(reference)}`}>
      <input
        style={{height: 39}}
        onFocus={() => setFocus([index, null])}
        onBlur={() => {
          setTimeout(() => {
            props.loseFocus([index, null])
          }, 100)
        }}
        className='mousetrap'
        readOnly
        onKeyDown={e => {
          if (e.key === 'Delete' || e.key === 'Backspace') {
            removeLine(index)
          } else if (e.key === 'Escape') {
            props.loseFocus([index, null])
          }
        }}
      />
    </td>
  )
}

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

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state, props) {
  return {
    reference: state.data.present.getIn(['lines', props.index, 'reference']),
  }
}

module.exports = reactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(Handle)
