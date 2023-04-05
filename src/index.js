import React from 'react'
import { render } from 'react-dom'
import { unregister } from './registerServiceWorker'

unregister()

render(
  <div style={{ fontSize: 18 }}>
    Unfortunately BOM Builder has been shut down due to Octopart API v3 being shut
    down. The source code is still available{' '}
    <a href="https://github.com/kitspace/bom-builder">on Github</a>.
  </div>,
  document.getElementById('root'),
)
