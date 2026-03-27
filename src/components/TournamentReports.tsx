'use client'

import React, { useState, useEffect } from 'react'
import { usePayloadAPI, Gutter, Select } from '@payloadcms/ui'
import { cardStyle, labelStyle, valueStyle } from './css/custom-css'

type Option = {
  label: string
  value: string
}

const TournamentReports: React.FC = () => {
  const [selectedTournament, setSelectedTournament] = useState<Option | null>(null)
  const [search, setSearch] = useState('')

  // ✅ Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400) // debounce delay

    return () => clearTimeout(timer)
  }, [search])

  // ✅ Build stats API
  const queryParams = new URLSearchParams()
  if (selectedTournament?.value) {
    queryParams.append('tournamentId', selectedTournament.value)
  }

  const statsUrl = `/api/tournament-registrations/income-from-tournament-registrations${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  // ✅ Build tournament search API
  const tournamentUrl = `/api/tournaments?limit=10${
    debouncedSearch ? `&where[name][like]=${encodeURIComponent(debouncedSearch)}` : ''
  }`

  // ✅ APIs
  const [{ data: stats, isLoading }] = usePayloadAPI(statsUrl)
  const [{ data: tournamentData }] = usePayloadAPI(tournamentUrl)

  // ✅ Map options
  const options: Option[] =
    tournamentData?.docs?.map((t: any) => ({
      label: t.name,
      value: t.id,
    })) || []

  const statsData = [
    { label: 'Total Paid', value: Number(stats?.totalPaid || 0) },
    { label: 'Total Due', value: Number(stats?.totalDue || 0) },
    { label: 'Total Registrations', value: Number(stats?.totalRegistrations || 0) },
  ]

  return (
    <Gutter>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <h2>Tournament Registration Summary</h2>

        <div style={{ width: 260 }}>
          <Select
            // Ensure we pass null if nothing is selected to help the component reset
            value={selectedTournament ?? undefined}
            onChange={(option) => {
              // Check for null/empty to handle the "Clear" (cross) button
              if (!option) {
                setSelectedTournament(null)
                setSearch('')
                return
              }

              if (Array.isArray(option)) return

              // Cast the valid option to your state type
              setSelectedTournament(option as unknown as Option)
            }}
            options={options}
            isClearable
            isSearchable
            placeholder="Search tournament..."
            onInputChange={(inputValue) => {
              setSearch(inputValue)
            }}
          />
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
        {statsData.map(({ label, value }) => (
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

export default TournamentReports
