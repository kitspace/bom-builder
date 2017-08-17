const React       = require('react')
const reactRedux  = require('react-redux')
const redux       = require('redux')

const {actions} = require('./state')

const Line = require('./line')

function Body(props) {
  return (
    <tbody>
      {props.lines.map((line, index) => (
        <Line key={line.get('id')} line={line} index={index} />
      ))}
    </tbody>
  )
}

function mapStateToProps(state) {
  return {
    lines: state.data.present.get('lines'),
  }
}

module.exports = reactRedux.connect(
  mapStateToProps
)(Body)
