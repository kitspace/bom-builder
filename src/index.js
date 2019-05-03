import React from 'react'
import {render} from 'react-dom'
import './index.css'
import App from './App'
import {unregister} from './registerServiceWorker'
import netlifyIdentity from 'netlify-identity-widget'

unregister()
netlifyIdentity.init({logo: false})
render(<App editable={true} />, document.getElementById('root'))
