// src/admin/components/CustomMenuItem.tsx
import React from 'react'
import Link from 'next/link' // Assuming you're using Next.js Link for navigation
import Image from 'next/image'

const DashboardNavLink = () => {
  return (
    <div style={{ minWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Link href="/admin">
          <Image
            src="/assets/uusc.webp"
            alt="uusc-logo"
            width={90}
            height={90}
            style={{ paddingBottom: '20px' }}
            unoptimized
          />
        </Link>
      </div>
    </div>
  )
}

export default DashboardNavLink
