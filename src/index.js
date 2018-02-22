import React from 'react'
import {render} from 'react-dom'
import './index.css'
import App from './App'
import registerServiceWorker from './registerServiceWorker'

import Perf from 'react-addons-perf'
window.Perf = Perf

render(<App editable={true} />, document.getElementById('root'))
registerServiceWorker()
