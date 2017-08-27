const superagent = require('superagent')

const partinfoURL = 'http://localhost:4001/graphql'

const part = `
  mpn {
    manufacturer
    part
  }
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
    image {
      url
      credit_string
      credit_url
    }
    stock_info {
      key
      name
      value
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

function getPartinfo(input) {
  let query = MpnQuery
  if (typeof input === 'string') {
    query = SearchQuery
  } else  {
    if (input.vendor) {
      query = SkuQuery
    }
    if (!input.part || input.part === '') {
      return Promise.resolve(null)
    }
  }

  return superagent
    .post(partinfoURL)
    .set('Accept', 'application/json')
    .send({
      query,
      variables: {
        input
      },
    }).then(res => {
      if (res.body.data.search) {
        res.body.data.search.forEach(s => s.type = 'search')
        return res.body.data.search
      } else if (res.body.data.part) {
        res.body.data.part.type = 'match'
        return res.body.data.part
      }
    }).catch(err => {
      console.error(err)
      return null
    })

}

module.exports = getPartinfo
