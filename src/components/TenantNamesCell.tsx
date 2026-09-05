import type { DefaultServerCellComponentProps } from 'payload'

type TenantCellEntry = {
  tenant?:
    | string
    | number
    | {
        name?: string | null
      }
    | null
}

export default function TenantNamesCell({
  cellData,
}: DefaultServerCellComponentProps<any, TenantCellEntry[] | null>) {
  if (!Array.isArray(cellData) || cellData.length === 0) {
    return <span>0 Tenants</span>
  }

  const names = cellData
    .map((entry) => {
      if (entry?.tenant && typeof entry.tenant === 'object') {
        return entry.tenant.name || 'Unnamed tenant'
      }

      return entry?.tenant ? String(entry.tenant) : null
    })
    .filter((name): name is string => Boolean(name))

  return <span>{names.length ? names.join(', ') : `${cellData.length} Tenant(s)`}</span>
}
