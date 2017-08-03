const superagent = require('superagent')
const ramda      = require('ramda')

const partinfoURL = 'https://partinfo.kitnic.it/graphql'

const MpnQuery = `
query MpnQuery($mpn: MpnInput!) {
  part(mpn: $mpn) {
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
  }
}`

function post(mpn) {
  if (!mpn.part || mpn.part === '') {
    return Promise.resolve(null)
  }
  return superagent
    .post(partinfoURL)
    .set('Accept', 'application/json')
    .send({
      query: MpnQuery,
      variables: {
        mpn
      },
    }).then(res => {
      return res.body.data.part
    }).catch(err => {
      console.error(err)
      return null
    })

}

function getPartinfo(lines) {
  const requests = lines.map(line => {
    return Promise.all(line.partNumbers.map(post))
  })
  return Promise.all(requests).then(ramda.flatten)
    .then(parts => parts.filter(x => x != null))
}

module.exports = getPartinfo
