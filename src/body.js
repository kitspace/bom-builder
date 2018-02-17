const React = require('react')
const reactRedux = require('react-redux')

const Line = require('./line')

function Body(props) {
  return (
    <tbody>
      {props.lineIds.map(lineId => <Line key={lineId} lineId={lineId} />)}
    </tbody>
  )
}

function mapStateToProps(state) {
  return {
    lineIds: state.data.present.get('order')
  }
}

module.exports = reactRedux.connect(mapStateToProps)(Body)
