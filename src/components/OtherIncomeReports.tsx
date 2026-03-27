'use client'

import React, { useState } from 'react'
import { usePayloadAPI, Gutter, DatePicker } from '@payloadcms/ui'
import { cardStyle, labelStyle, valueStyle } from './css/custom-css'

const OtherIncomeReports: React.FC = () => {
  const [month, setMonth] = useState<Date | null>(null)

  // ✅ Extract month & year
  const queryParams = new URLSearchParams()

  if (month) {
    queryParams.append('month', String(month.getMonth() + 1))
    queryParams.append('year', String(month.getFullYear()))
  }

  const apiUrl = `/api/other-incomes/income-from-others${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  const [{ data, isLoading, isError }] = usePayloadAPI(apiUrl)

  if (isError) return null

  // ✅ Use correct fields from backend
  const stats = [
    {
      label: 'Total Other Income Amount',
      value: Number(data?.totalOtherIncomeAmount || 0),
    },
    {
      label: 'Total Other Income Count',
      value: Number(data?.totalOtherIncomeCount || 0),
    },
  ]

  return (
    <Gutter>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <h2 style={{ margin: 0 }}>Other Income Summary</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ width: '220px' }}>
            <DatePicker
              value={month || ''}
              onChange={(val) => setMonth(val as Date)}
              displayFormat="MM/yyyy"
              pickerAppearance="monthOnly"
              placeholder="Select Month"
            />
          </div>

          {month && (
            <button
              onClick={() => setMonth(null)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--theme-elevation-150)',
                border: '1px solid var(--theme-elevation-250)',
                borderRadius: '4px',
                cursor: 'pointer',
                height: '40px',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          margin: '20px 0',
          opacity: isLoading ? 0.6 : 1,
          transition: 'opacity 0.2s ease-in-out',
          position: 'relative',
        }}
      >
        {stats.map(({ label, value }) => (
          <div key={label} style={cardStyle}>
            <div style={labelStyle}>{label}</div>
            <div style={valueStyle}>{value}</div>
          </div>
        ))}

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              color: 'var(--theme-text)',
              fontWeight: 'bold',
              background: 'var(--theme-elevation-50)',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            Updating...
          </div>
        )}
      </div>
    </Gutter>
  )
}

export default OtherIncomeReports
