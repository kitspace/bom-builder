import * as oneClickBom from '1-click-bom'

export function getRetailerList() {
  return oneClickBom
    .getRetailers()
    .filter(
      r =>
        r !== 'Rapid' && r !== 'Newark' && r !== 'LCSC' && r !== 'JLC Assembly'
    )
}
