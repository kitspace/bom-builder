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

const match_cache = {}

function mpnOrSkuToKey(input) {
  return (input.vendor || input.manufacturer) + ':' + input.part
}

function cachePart(part) {
  if (part && part.offers) {
    const key = mpnOrSkuToKey(part.mpn)
    match_cache[key] = part
    part.offers.forEach(offer => {
      const k = mpnOrSkuToKey(offer.sku)
      match_cache[k] = part
    })
  }
}

function addMatchRequest(input) {
  return new Promise((resolve, reject) => {
    const key = mpnOrSkuToKey(input)
    if (key in match_cache) {
      return resolve(match_cache[key])
    }
    const id = makeId()
    response_bus.once(id, r => {
      cachePart(r)
      resolve(r)
    })
    match_request_bus.emit('request', {id, input})
  })
}

const search_cache = {}

export default function getPartinfo(input) {
  if (!input) {
    return Promise.resolve(null)
  }
  if (typeof input === 'string') {
    if (input in search_cache) {
      return Promise.resolve(search_cache[input])
    }
    return runQuery(SearchQuery, input).then(r => {
      if (!r) {
        console.error('empty search response')
        return null
      }
      search_cache[input] = r
      r.forEach(cachePart)
      return r
    })
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
    .retry(10)
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
