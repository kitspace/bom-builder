const assert    = require('better-assert')
const immutable = require('immutable')
const {initialState, makeReducer, linesActions, emptyLine} = require('../src/state')


const linesReducer = makeReducer(linesActions)


describe('bom_edit lines actions', () => {
  describe('lines', () => {
    it('adds a line', () => {
      const data = initialState.data
      const lines1 = data.get('lines')
      assert(lines1.size === 0)
      const lines2 = linesReducer(data.merge({lines: lines1}), {type: 'addLine', value: emptyLine}).get('lines')
      assert(lines1.size === 0)
      assert(lines2.size === 1)
      assert(lines2.get(0).get('id') != null)
    })
    it('removes a line', () => {
      const data = initialState.data
      const lines1 = data.get('lines')
      assert(lines1.size === 0)
      let lines2 = linesReducer(data.set('lines', lines1), {type: 'addLine', value: emptyLine}).get('lines')
      lines2 = linesReducer(data.set('lines', lines2), {type: 'addLine', value: emptyLine}).get('lines')
      lines2 = linesReducer(data.set('lines', lines2), {type: 'addLine', value: emptyLine}).get('lines')
      assert(lines1.size === 0)
      assert(lines2.size === 3)
      const lines3 = linesReducer(data.set('lines', lines2), {type: 'removeLine', value: 0}).get('lines')
      assert(lines1.size === 0)
      assert(lines2.size === 3)
      assert(lines3.size === 2)
    })
  })
  describe('TSV', () => {
    it('lets you set from TSV', () => {
      const tsv = 'References\tQty\tDigikey\ntest\t1\t8-98-989'
      const lines = linesReducer(
        initialState.data,
        {type: 'setFromTsv', value: tsv}
      ).get('lines')
      const line      = lines.first()
      const quantity  = line.get('quantity')
      const reference = line.get('reference')
      const digikey   = line.get('retailers').get('Digikey')
      assert(quantity  === 1)
      assert(reference === 'test')
      assert(digikey   === '8-98-989')
    })
  })
  describe('sorting', () => {
    const data1 = initialState.data
    let data2
    beforeEach('set order', () => {
      data2 = linesReducer(
        data1,
        {type: 'addLine', value: emptyLine.set('reference', 'C')}
      )
      data2 = linesReducer(
        data2,
        {type: 'addLine', value: emptyLine.set('reference', 'B')}
      )
      data2 = linesReducer(
        data2,
        {type: 'addLine', value: emptyLine.set('reference', 'A')}
      )
      const lines2 = data2.get('lines')
      assert(lines2.size === 3)
      const order = lines2.map(x => x.get('reference'))
      assert(order.equals(immutable.List.of('C', 'B', 'A')))
    })
    it('sorts by reference', () => {
      const lines3 = linesReducer(data2, {type: 'sortBy', value:'reference'}).get('lines')
      const order = lines3.map(x => x.get('reference'))
      assert(order.equals(immutable.List.of('A', 'B', 'C')))
    })
  })
})

