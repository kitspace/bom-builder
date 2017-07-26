import './App.css'
import 'semantic-ui-css/semantic.css'
const React = require('react')
const semantic = require('semantic-ui-react')
const redux = require('redux')
const reactRedux = require('react-redux')
const superagent = require('superagent')

const {reducer, initial_state} = require('./state')

const App = React.createClass({
  store: redux.createStore(reducer),
  getInitialState() {
    return this.store.getState().toJS()
  },
  render() {
    return <pre>{JSON.stringify(this.state, null, 2)}</pre>
  },
  componentDidMount() {
    superagent.get('/1-click-BOM.tsv').then(r => {
      this.store.dispatch({type: 'setFromTsv', value: r.text})
    })
    this.store.subscribe(() => {
      const state = this.store.getState().toJS()
      this.setState(state)
    })
  },
})

export default App
