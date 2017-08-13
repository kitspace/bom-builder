const superagent = require('superagent')

const partinfoURL = 'https://partinfo.kitnic.it/graphql'

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
    prices {
      USD
      EUR
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

function getPartinfo(mpnOrSku) {
  let query = MpnQuery
  if (mpnOrSku.vendor) {
    query = SkuQuery
  }

  if (!mpnOrSku.part || mpnOrSku.part === '') {
    return Promise.resolve(null)
  }

  return superagent
    .post(partinfoURL)
    .set('Accept', 'application/json')
    .send({
      query,
      variables: {
        input: mpnOrSku
      },
    }).then(res => {
      return res.body.data.part
    }).catch(err => {
      console.error(err)
      return null
    })

}

module.exports = getPartinfo
