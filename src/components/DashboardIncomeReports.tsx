'use client'

import React, { useState } from 'react'
import { usePayloadAPI, DatePicker, useAuth } from '@payloadcms/ui'
import { cardStyle, labelStyle, valueStyle } from './css/custom-css'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(val)

const DashboardIncomeReports: React.FC = () => {
  const { user } = useAuth()
  const [month, setMonth] = useState<Date | null>(null)

  const queryParams = new URLSearchParams()
  if (month) {
    queryParams.append('month', String(month.getMonth() + 1))
    queryParams.append('year', String(month.getFullYear()))
  }

  const apiUrl = `/api/other-incomes/overall-income-stats${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  const isManager = user?.role?.includes('coach')
  if (isManager) return null

  const [{ data, isLoading, isError }] = usePayloadAPI(apiUrl)

  if (isError) {
    return (
      <div>
        <p>Error loading dashboard stats.</p>
      </div>
    )
  }

  const summary = data?.summary || {}
  const breakdown = data?.breakdown || {}

  return (
    <div style={{ marginBottom: '20px', width: '100%', position: 'relative' }}>
      {/* 1. TOP LOADING OVERLAY - Subtly indicates background refresh */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '0',
            fontSize: '12px',
            color: 'var(--theme-success-500)',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span className="loading-dot"></span> Fetching Data...
          <style>{`
            .loading-dot {
              width: 8px; height: 8px; 
              background: var(--theme-success-500); 
              border-radius: 50%; 
              animation: pulse 1.5s infinite;
            }
            @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
          `}</style>
        </div>
      )}

      {/* Header Section */}
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
        <div>
          <h1 style={{ margin: 0 }}>Income Status</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.7 }}>
            {month
              ? `Income for ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}`
              : 'All-time cumulative income'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ width: '220px' }}>
            <DatePicker
              value={month || ''}
              onChange={(val) => setMonth(val as Date)}
              displayFormat="MM/yyyy"
              pickerAppearance="monthOnly"
              placeholder="Filter by Month"
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

      {/* Stats Container with Opacity during Loading */}
      <div
        style={{
          opacity: isLoading ? 0.5 : 1,
          transition: 'opacity 0.3s ease',
          pointerEvents: isLoading ? 'none' : 'auto', // Prevent clicks during load
        }}
      >
        {/* Primary Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div style={{ ...cardStyle, borderLeft: '5px solid #4caf50' }}>
            <div style={labelStyle}>Grand Total Income</div>
            <div style={{ ...valueStyle, fontSize: '32px', color: '#4caf50' }}>
              {formatCurrency(summary.grandTotalIncome || 0)}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '5px solid #f44336' }}>
            <div style={labelStyle}>Total Outstanding Due</div>
            <div style={{ ...valueStyle, fontSize: '32px', color: '#f44336' }}>
              {formatCurrency(summary.grandTotalDue || 0)}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '5px solid #2196f3' }}>
            <div style={labelStyle}>Collection Rate</div>
            <div style={{ ...valueStyle, fontSize: '32px' }}>
              {Number(summary.collectionRate || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <h3 style={{ marginBottom: '20px' }}>Income Breakdown</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <BreakdownCard label="Members Registration" income={breakdown.memberRegistrationIncome} />
          <BreakdownCard label="Members Subscription" income={breakdown.memberSubscriptionIncome} />
          <BreakdownCard
            label="Members Status"
            income={breakdown.memberIncome}
            due={breakdown.memberDue}
          />
          <BreakdownCard
            label="Student Registration"
            income={breakdown.studentRegistrationIncome}
          />
          <BreakdownCard
            label="Student Subscription"
            income={breakdown.studentSubscriptionIncome}
          />
          <BreakdownCard
            label="Students Status"
            income={breakdown.studentIncome}
            due={breakdown.studentDue}
          />
          <BreakdownCard
            label="Bookings"
            income={breakdown.bookingIncome}
            due={breakdown.bookingDue}
          />
          <BreakdownCard label="Sponsors" income={breakdown.sponsorIncome} />
          <BreakdownCard label="Others" income={breakdown.otherIncome} />
        </div>
      </div>
    </div>
  )
}

const BreakdownCard = ({ label, income, due }: { label: string; income: number; due?: number }) => (
  <div style={{ ...cardStyle, background: 'var(--theme-elevation-50)' }}>
    <div
      style={{
        ...labelStyle,
        fontWeight: 'bold',
        borderBottom: '1px solid var(--theme-elevation-150)',
        marginBottom: '10px',
        paddingBottom: '5px',
      }}
    >
      {label}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
      <span style={{ fontSize: '12px', opacity: 0.8 }}>Income:</span>
      <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatCurrency(income || 0)}</span>
    </div>
    {due !== undefined && (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>Due:</span>
        <span style={{ fontSize: '14px', color: '#f44336' }}>{formatCurrency(due || 0)}</span>
      </div>
    )}
  </div>
)

export default DashboardIncomeReports
