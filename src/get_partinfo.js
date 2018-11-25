import superagent from 'superagent'
import EventEmitter from 'events'

const part = `
  mpn {
    manufacturer
    part
  }
  type
  datasheet
  description
  image {
    url
    credit_string
    credit_url
  }
  specs {
    key
    name
    value
  }
  offers {
    sku {
      vendor
      part
    }
    description
    moq
    in_stock_quantity
    stock_location
    image {
      url
      credit_string
      credit_url
    }
    specs {
      key
      name
      value
    }
    prices {
      GBP
      EUR
      USD
    }
  }
`

const MpnQuery = `
query MpnQuery($input: MpnInput!) {
  part(mpn: $input) {
    ${part}
  }
}`

const SkuQuery = `
query SkuQuery($input: SkuInput!) {
  part(sku: $input) {
    ${part}
  }
}`

const SearchQuery = `
query SearchQuery($input: String!) {
  search(term: $input) {
    ${part}
  }
}`

const MatchQuery = `
query MatchQuery($input: [MpnOrSku]!) {
  match(parts: $input) {
    ${part}
  }
}`

const request_bus = new EventEmitter()
const response_bus = new EventEmitter()

let requests = []
request_bus.on('request', ({id, input}) => {
  requests.push({id, input})
  runRequests()
})

setInterval(runRequests, 1000)

let previous_time = Date.now()
async function runRequests() {
  const time = Date.now()
  if (
    requests.length >= 20 ||
    (time - previous_time > 10000 && requests.length > 0)
  ) {
    previous_time = time
    const parts = requests.map(({input}) => {
      if (input.vendor) {
        return {sku: input}
      }
      return {mpn: input}
    })
    const ids = requests.map(({id}) => id)
    requests = []
    const matches = await runQuery(MatchQuery, parts)
    matches.forEach((r, i) => {
      const id = ids[i]
      response_bus.emit(id, r)
    })
  }
}

function IdMaker() {
  this.id = 0
  return () => this.id++
}

const makeId = new IdMaker()

function addRequest(input) {
  return new Promise((resolve, reject) => {
    let timeout
    const id = makeId()
    response_bus.once(id, r => {
      clearTimeout(timeout)
      resolve(r)
    })
    request_bus.emit('request', {id, input})
    timeout = setTimeout(() => reject(new Error('timed out')), 60000)
  })
}

export default function getPartinfo(input) {
  if (typeof input === 'string') {
    return runQuery(SearchQuery, input)
  }
  if (!input.part || input.part === '') {
    return Promise.resolve(null)
  }
  return addRequest(input)
}

function runQuery(query, input) {
  return superagent
    .post(process.env.REACT_APP_PARTINFO_URL)
    .set('Accept', 'application/json')
    .send({
      query,
      variables: {
        input
      }
    })
    .then(res => {
      if (res.body.data.search) {
        return res.body.data.search
      } else if (res.body.data.part) {
        return res.body.data.part
      } else if (res.body.data.match) {
        return res.body.data.match
      }
    })
    .catch(err => {
      console.error(err)
      return null
    })
}
