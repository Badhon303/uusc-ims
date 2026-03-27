'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePayloadAPI, Gutter, Select } from '@payloadcms/ui'
import { cardStyle, labelStyle, valueStyle } from './css/custom-css'

type Option = {
  label: string
  value: string
}

const PAGE_SIZE = 10

const TournamentReports: React.FC = () => {
  const [selectedTournament, setSelectedTournament] = useState<Option | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [page, setPage] = useState(1)
  const [accumulatedOptions, setAccumulatedOptions] = useState<Option[]>([])
  const [hasMore, setHasMore] = useState(true)
  const prevSearch = useRef(debouncedSearch)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Reset pagination when search changes
  useEffect(() => {
    if (debouncedSearch !== prevSearch.current) {
      prevSearch.current = debouncedSearch
      setPage(1)
      setAccumulatedOptions([])
      setHasMore(true)
    }
  }, [debouncedSearch])

  // Build stats API URL
  const queryParams = new URLSearchParams()
  if (selectedTournament?.value) {
    queryParams.append('tournamentId', selectedTournament.value)
  }

  const statsUrl = `/api/tournament-registrations/income-from-tournament-registrations${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`

  // Build paginated tournament search URL
  const tournamentUrl =
    `/api/tournaments?limit=${PAGE_SIZE}&page=${page}` +
    (debouncedSearch ? `&where[name][like]=${encodeURIComponent(debouncedSearch)}` : '')

  // APIs
  const [{ data: stats, isLoading: statsLoading }] = usePayloadAPI(statsUrl)
  const [{ data: tournamentData, isLoading: tournamentsLoading }] = usePayloadAPI(tournamentUrl)

  // Accumulate options as pages load
  useEffect(() => {
    if (!tournamentData?.docs) return

    const newOptions: Option[] = tournamentData.docs.map((t: any) => ({
      label: t.name,
      value: t.id,
    }))

    setAccumulatedOptions((prev) => {
      // Deduplicate by value
      const existingIds = new Set(prev.map((o) => o.value))
      const unique = newOptions.filter((o) => !existingIds.has(o.value))
      return page === 1 ? newOptions : [...prev, ...unique]
    })

    // Check if there are more pages
    const totalPages = tournamentData.totalPages ?? 1
    setHasMore(page < totalPages)
  }, [tournamentData])

  // Load next page when user scrolls to bottom of dropdown
  const handleMenuScrollToBottom = () => {
    if (!tournamentsLoading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

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
            value={selectedTournament ?? undefined}
            onChange={(option) => {
              if (!option) {
                setSelectedTournament(null)
                setSearch('')
                return
              }
              if (Array.isArray(option)) return
              setSelectedTournament(option as unknown as Option)
            }}
            options={accumulatedOptions}
            isClearable
            isSearchable
            isLoading={tournamentsLoading}
            placeholder="Search tournament..."
            onInputChange={(inputValue) => {
              setSearch(inputValue)
            }}
            onMenuScrollToBottom={handleMenuScrollToBottom}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          margin: '20px 0',
          opacity: statsLoading ? 0.6 : 1,
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

        {statsLoading && (
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
