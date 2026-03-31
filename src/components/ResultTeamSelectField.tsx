'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useField } from '@payloadcms/ui'

type Props = {
  path: string // e.g., "teamPositions.0.team"
  field: {
    label: string
    required?: boolean
  }
}

const ResultTeamSelectField: React.FC<Props> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })
  const label = typeof field.label === 'string' ? field.label : 'Team'
  const required = field.required || false

  // Get the tournament ID from the top level
  const tournament = useFormFields(([fields]) => fields['tournament']?.value as string)

  const [allTeams, setAllTeams] = useState<{ id: string; teamName: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch teams when tournament changes
  useEffect(() => {
    if (!tournament) {
      setAllTeams([])
      setValue('')
      return
    }

    setLoading(true)
    fetch(`/api/tournament-matches/team-names?tournamentId=${tournament}`)
      .then((res) => res.json())
      .then((data) => setAllTeams(data.teams || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tournament, setValue])

  if (!tournament) {
    return (
      <div className="field-type" style={{ marginBottom: '20px' }}>
        <label
          htmlFor={path}
          className="field-label"
          style={{
            marginBottom: '5px',
            display: 'block',
            color: 'var(--theme-elevation-800)',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--theme-error-500)', marginLeft: '4px' }}>*</span>
          )}
        </label>
        <p
          style={{
            margin: 0,
            padding: '0.75rem 1rem',
            color: 'var(--theme-elevation-600)',
            fontSize: '0.875rem',
            border: '1px solid var(--theme-elevation-300)',
            background: 'var(--theme-input-bg)',
          }}
        >
          Please select a tournament first
        </p>
      </div>
    )
  }

  return (
    <div className="field-type" style={{ marginBottom: '20px' }}>
      <label
        htmlFor={path}
        className="field-label"
        style={{
          marginBottom: '5px',
          display: 'block',
          color: 'var(--theme-elevation-800)',
          fontWeight: '400',
          fontSize: '1rem',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--theme-error-500)', marginLeft: '4px' }}>*</span>}
      </label>
      {loading ? (
        <p
          style={{
            margin: 0,
            padding: '0.75rem 1rem',
            color: 'var(--theme-elevation-600)',
            fontSize: '0.875rem',
          }}
        >
          Loading teams...
        </p>
      ) : (
        <select
          id={path}
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          required={required}
          style={{
            width: '100%',
            padding: '0.75rem 2rem 0.75rem 1rem',
            borderRadius: '0',
            border: '1px solid var(--theme-elevation-300)',
            background: 'var(--theme-input-bg)',
            color: 'var(--theme-elevation-800)',
            fontSize: '1rem',
            lineHeight: '1.5',
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
            transition: 'border-color 0.1s ease-in-out',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237a7d84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '16px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-elevation-400)'
            e.currentTarget.style.outline = 'none'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--theme-elevation-300)'
          }}
        >
          <option value="">-- Select {label} --</option>
          {allTeams.map((team) => (
            <option key={team.id} value={team.teamName}>
              {team.teamName}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default ResultTeamSelectField
