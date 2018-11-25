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

const match_request_bus = new EventEmitter()
const response_bus = new EventEmitter()

let match_requests = []
match_request_bus.on('request', ({id, input}) => {
  match_requests.push({id, input})
  runMatchRequests()
})

setInterval(runMatchRequests, 1000)

let previous_time = Date.now()
async function runMatchRequests() {
  const time = Date.now()
  if (
    match_requests.length >= 20 ||
    (time - previous_time > 10000 && match_requests.length > 0)
  ) {
    previous_time = time
    const parts = match_requests.map(({input}) => {
      if (input.vendor) {
        return {sku: input}
      }
      return {mpn: input}
    })
    const ids = match_requests.map(({id}) => id)
    match_requests = []
    const matches = await runQuery(MatchQuery, parts)
    if (matches) {
      matches.forEach((r, i) => {
        const id = ids[i]
        response_bus.emit(id, r)
      })
    }
  }
}

function IdMaker() {
  this.id = 0
  return () => this.id++
}

const makeId = new IdMaker()

function addMatchRequest(input) {
  return new Promise((resolve, reject) => {
    let timeout
    const id = makeId()
    response_bus.once(id, r => {
      clearTimeout(timeout)
      resolve(r)
    })
    match_request_bus.emit('request', {id, input})
    timeout = setTimeout(() => {
      console.error('Request timed out')
      resolve()
    }, 60000)
  })
}

export default function getPartinfo(input) {
  if (typeof input === 'string') {
    if (!input) {
      return Promise.resolve(null)
    }
    return runQuery(SearchQuery, input)
  }
  if (!input.part || input.part === '') {
    return Promise.resolve(null)
  }
  return addMatchRequest(input)
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
