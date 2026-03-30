'use client'

import React, { useState } from 'react'
import { usePayloadAPI, DatePicker, useAuth } from '@payloadcms/ui'
import { cardStyle, labelStyle, valueStyle } from './css/custom-css'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(val)

const DashboardExpenseReports: React.FC = () => {
  const { user } = useAuth()
  const [month, setMonth] = useState<Date | null>(null)

  const queryParams = new URLSearchParams()
  if (month) {
    queryParams.append('month', String(month.getMonth() + 1))
    queryParams.append('year', String(month.getFullYear()))
  }

  // Points to the endpoint we created earlier
  const apiUrl = `/api/expenditures/overall-expenditures-stats${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  const [{ data, isLoading, isError }] = usePayloadAPI(apiUrl)
  const isManager = user?.role?.includes('coach')
  if (isManager) return null

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
      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '0',
            fontSize: '12px',
            color: '#f44336',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span className="loading-dot-red"></span> Updating Expenses...
          <style>{`
            .loading-dot-red {
              width: 8px; height: 8px; 
              background: #f44336; 
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
          <h1 style={{ margin: 0 }}>Expense Status</h1>
          <p style={{ margin: '5px 0 0', opacity: 0.7 }}>
            {month
              ? `Expenses for ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}`
              : 'All-time cumulative expenditures'}
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

      <div style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        {/* Primary Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div style={{ ...cardStyle, borderLeft: '5px solid #ff9800' }}>
            <div style={labelStyle}>Grand Total Spent</div>
            <div style={{ ...valueStyle, fontSize: '32px', color: '#ff9800' }}>
              {formatCurrency(summary.grandTotalExpenditure || 0)}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '5px solid #f44336' }}>
            <div style={labelStyle}>Unpaid Salary Liabilities</div>
            <div style={{ ...valueStyle, fontSize: '32px', color: '#f44336' }}>
              {formatCurrency(summary.totalSalaryDue || 0)}
            </div>
          </div>
          <div style={{ ...cardStyle, borderLeft: '5px solid #607d8b' }}>
            <div style={labelStyle}>Total Operational Cost</div>
            <div style={{ ...valueStyle, fontSize: '32px' }}>
              {formatCurrency(summary.totalOperationalCost || 0)}
            </div>
          </div>
        </div>

        {/* Breakdown Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* 1. Salaries Section */}
          <section>
            <h3 style={{ marginBottom: '20px' }}>Salary Expenditures</h3>
            <div style={breakdownGridStyle}>
              <ExpenseCard
                label="Coach Salaries"
                paid={breakdown.coachSalaryPaid}
                due={breakdown.coachSalaryDue}
              />
              <ExpenseCard
                label="Staff Salaries"
                paid={breakdown.staffSalaryPaid}
                due={breakdown.staffSalaryDue}
              />
              <ExpenseCard
                label="Manager Salaries"
                paid={breakdown.managerSalaryPaid}
                due={breakdown.managerSalaryDue}
              />
            </div>
          </section>

          {/* 2. General Section */}
          <section>
            <h3 style={{ marginBottom: '20px' }}>General Expenditures</h3>
            <div style={breakdownGridStyle}>
              <ExpenseCard label="Maintenance" paid={breakdown.maintenance} />
              <ExpenseCard label="Utility Bills" paid={breakdown.utilityBill} />
              <ExpenseCard label="Equipment" paid={breakdown.equipmentPurchase} />
              <ExpenseCard label="Tournaments" paid={breakdown.tournamentExpenses} />
              <ExpenseCard label="Indoor Facility" paid={breakdown.indoorFacility} />
              <ExpenseCard label="Miscellaneous" paid={breakdown.miscellaneous} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

const breakdownGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
}

const ExpenseCard = ({ label, paid, due }: { label: string; paid: number; due?: number }) => (
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
      <span style={{ fontSize: '12px', opacity: 0.8 }}>Paid:</span>
      <span style={{ fontSize: '14px', fontWeight: 600 }}>{formatCurrency(paid || 0)}</span>
    </div>
    {due !== undefined && (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>Due:</span>
        <span style={{ fontSize: '14px', color: '#f44336' }}>{formatCurrency(due || 0)}</span>
      </div>
    )}
  </div>
)

export default DashboardExpenseReports
