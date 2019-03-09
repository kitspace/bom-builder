import React, {useState} from 'react'
import * as redux from 'redux'
import * as reactRedux from 'react-redux'
import * as reselect from 'reselect'
import * as semantic from 'semantic-ui-react'

import SimpleCell from './simple_cell'
import * as selectors from './selectors'
import {actions} from './state'

function DescriptionCell(props) {
  const [searching, setSearching] = useState(null)
  return (
    <>
      <SimpleCell
        hidden={props.hidden}
        field={props.field}
        lineId={props.lineId}
      />
      <td
        className={
          'searchCell' +
          (props.searching === 'done' ? ' searchCellInvisible' : '')
        }
      >
        {props.value &&
          props.searching !== 'done' && (
            <div
              className="searchCellInner"
              onClick={() => {
                setSearching(true)
                setImmediate(() => {
                  props.search !== 'searching' &&
                    props.setSuggestionsSearch({
                      lineId: props.lineId,
                      status: 'start'
                    })
                })
              }}
            >
              {props.searching === 'searching' ||
              props.searching === 'start' ||
              searching ? (
                <semantic.Loader active inline size="mini" />
              ) : (
                <semantic.Popup
                  size="mini"
                  inverted
                  position="bottom left"
                  verticalOffset={3}
                  horizontalOffset={7}
                  trigger={<semantic.Icon color="grey" name="search" />}
                  content="Search for description"
                />
              )}
            </div>
          )}
      </td>
    </>
  )
}

function mapStateToProps() {
  const active = selectors.makeActiveSelector()
  const searching = selectors.makeSuggestionsSearching()
  return reselect.createSelector(
    [selectors.value, active, searching],
    (value, active, searching) => ({
      value,
      active,
      searching
    })
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(
  DescriptionCell
)
