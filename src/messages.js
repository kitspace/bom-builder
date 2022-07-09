import React from 'react'
import * as semantic from 'semantic-ui-react'
import * as reactRedux from 'react-redux'
import * as redux from 'redux'
import './messages.css'

import { actions } from './state'

function Messages(props) {
  return (
    <div className="messages">
      <semantic.Message
        key="octopart"
        negative
      >
        <semantic.Message.Header>Octopart API is down</semantic.Message.Header>
        <semantic.Message.Content>We apologise but the Octopart API seems to be down. The BOM Builder will not work without it. Please try again later.</semantic.Message.Content>
      </semantic.Message>
      {props.buyPartsMessages.slice(0, 3).map(message => {
        const vendor = message.getIn(['sku', 'vendor'])
        const title = `Problem with adding part to ${vendor} cart`
        const part = message.getIn(['sku', 'part'])
        const id = message.get('id')
        if (part == null) {
          return (
            <semantic.Message
              key={id}
              negative
              onDismiss={() => props.removeBuyPartsMessage(id)}
            >
              <semantic.Message.Header>{title}</semantic.Message.Header>
            </semantic.Message>
          )
        }
        let reference = message.get('reference')
        if (reference.length > 20) {
          reference = reference.slice(0, 20) + '...'
        }
        const messageBody = `"${reference}": ${part}`
        return (
          <semantic.Message
            floating
            key={id}
            negative
            onDismiss={() => props.removeBuyPartsMessage(id)}
          >
            <semantic.Message.Header>{title}</semantic.Message.Header>
            {messageBody}
          </semantic.Message>
        )
      })}
    </div>
  )
}

function mapDispatchToProps(dispatch) {
  return redux.bindActionCreators(actions, dispatch)
}

function mapStateToProps(state) {
  return {
    buyPartsMessages: state.view.get('buyPartsMessages')
  }
}

export default reactRedux.connect(mapStateToProps, mapDispatchToProps)(Messages)
