import './App.css'
import 'semantic-ui-css/semantic.css'
const React = require('react')
const semantic = require('semantic-ui-react')
const redux = require('redux')
const reactRedux = require('react-redux')

const {reducer, initial_state} = require('./state')

const store = redux.createStore(reducer, initial_state)

class App extends React.Component {
  render() {
    return (
      <reactRedux.Provider store={store}>
        <div className="App">
          <semantic.Table>
          </semantic.Table>
        </div>
      </reactRedux.Provider>
    )
  }
}

export default App
