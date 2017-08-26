import React from 'react';
import {render} from 'react-snapshot';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import Perf from 'react-addons-perf'
window.Perf = Perf

let innerHeight  = window.innerHeight
window.onresize = function(event) {
  innerHeight = window.innterHei

};


render(<App editable={true}/>, document.getElementById('root'));
registerServiceWorker();
