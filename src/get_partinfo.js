import superagent from 'superagent'

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

export default function getPartinfo(input) {
  let query = MpnQuery
  if (typeof input === 'string') {
    query = SearchQuery
  } else {
    if (input.vendor) {
      query = SkuQuery
    }
    if (!input.part || input.part === '') {
      return Promise.resolve(null)
    }
  }

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
      }
    })
    .catch(err => {
      console.error(err)
      return null
    })
}
