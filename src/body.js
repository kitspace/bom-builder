const React       = require('react')
const reactRedux  = require('react-redux')
const redux       = require('redux')

const {actions} = require('./state')

const Line = require('./line')

function Body(props) {
  return (
    <tbody>
      {props.lineIds.map((lineId, index) => (
        <Line key={lineId} lineId={lineId} index={index} />
      ))}
    </tbody>
  )
}

function mapStateToProps(state) {
  return {
    lineIds: state.data.present.get('lines').map(l => l.get('id')),
  }
}

module.exports = reactRedux.connect(
  mapStateToProps
)(Body)
