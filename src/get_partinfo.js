import superagent from 'superagent'
import promiseRateLimit from 'promise-rate-limit'

const runQueryLimited = promiseRateLimit(20, 100, runQuery)

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

const match_cache = {}
const search_cache = {}

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

export default function getPartinfo(input) {
  if (!input) {
    return Promise.resolve(null)
  }
  if (typeof input === 'string') {
    if (input in search_cache) {
      return Promise.resolve(search_cache[input])
    }
    return runQueryLimited(SearchQuery, input).then(r => {
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
  const query = input.vendor ? SkuQuery : MpnQuery
  if (input.vendor === 'Rapid') {
    return Promise.resolve(null)
  }
  const key = mpnOrSkuToKey(input)
  if (key in match_cache) {
    return Promise.resolve(match_cache[key])
  }
  return runQueryLimited(query, input).then(part => {
    cachePart(part)
    return part
  })
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
