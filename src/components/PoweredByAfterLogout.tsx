// src/components/CustomLogout.tsx
import { Logout } from '@payloadcms/ui'

import PoweredByComponent from './PoweredBy'

export default function PoweredByAfterLogoutComponent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <Logout />
      <PoweredByComponent />
    </div>
  )
}
