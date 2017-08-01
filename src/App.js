import './App.css'
import 'semantic-ui-css/semantic.css'
import './fontello.css'

const React       = require('react')
const semantic    = require('semantic-ui-react')
const redux       = require('redux')
const reactRedux  = require('react-redux')
const superagent  = require('superagent')
const oneClickBom = require('1-click-bom')
const immutable   = require('immutable')
const mousetrap   = require('mousetrap')
const DoubleScrollBar = require('react-double-scrollbar')

const {mainReducer, initialState} = require('./state')
const store = redux.createStore(mainReducer, initialState)

const actions = redux.bindActionCreators(require('./state').actions, store.dispatch)

const Header = require('./header')
const Body   = require('./body')

const Bom = React.createClass({
  render() {
    return (
      <reactRedux.Provider store={store}>
        <DoubleScrollBar>
          <semantic.Table
            className='Bom'
            size='small'
            celled
            unstackable
            singleLine
          >
            <Header />
            <Body />
          </semantic.Table>
        </DoubleScrollBar>
      </reactRedux.Provider>
    )
  },
  componentDidMount() {
    superagent.get('1-click-BOM.tsv').then(r => {
      actions.setFromTsv(r.text)
    })
    actions.setEditable(this.props.editable)
    mousetrap.bind('ctrl+z', actions.undo)
    mousetrap.bind('ctrl+y', actions.redo)
  },
})



export default Bom
