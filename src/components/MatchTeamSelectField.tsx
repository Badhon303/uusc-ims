'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useFormFields, useField } from '@payloadcms/ui'

type Props = {
  path: string
  field: {
    label: string
    required?: boolean
  }
}

type Player = {
  id: number
  name: string
}

type Team = {
  id: string
  teamName: string
  players: Player[]
}

const MatchTeamSelectField: React.FC<Props> = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })
  const label = typeof field.label === 'string' ? field.label : path.split('.').pop()
  const required = field.required || false
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const tournament = useFormFields(([fields]) => fields['tournament']?.value as string)

  const pathParts = path.split('.')
  const basePath = pathParts.slice(0, -1).join('.')
  const currentFieldName = pathParts[pathParts.length - 1]

  const siblingData = useFormFields(([fields]) => {
    return {
      teamOne: fields[`${basePath}.teamOne`]?.value as string,
      teamTwo: fields[`${basePath}.teamTwo`]?.value as string,
    }
  })

  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)

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
  }, [tournament])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getFilteredOptions = () => {
    if (currentFieldName === 'teamTwo') {
      return allTeams.filter((t) => t.teamName !== siblingData.teamOne)
    }

    if (currentFieldName === 'winner') {
      return allTeams.filter(
        (t) => t.teamName === siblingData.teamOne || t.teamName === siblingData.teamTwo,
      )
    }

    return allTeams
  }

  const handlePlayerClick = (e: React.MouseEvent, playerId: number, playerName: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`/admin/collections/users/${playerId}`, '_blank')
  }

  const handleTeamSelect = (teamName: string) => {
    setValue(teamName)
    setIsOpen(false)
  }

  if (!tournament) return null

  const filteredTeams = getFilteredOptions()
  const selectedTeam = allTeams.find((t) => t.teamName === value)

  return (
    <div className="field-type" style={{ width: '32.33%' }}>
      <label
        htmlFor={path}
        className="field-label"
        style={{
          marginBottom: '5px',
          display: 'block',
          color: 'var(--theme-elevation-800)',
          fontSize: '1rem',
          fontWeight: '400',
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
            fontSize: '1rem',
            fontWeight: '400',
          }}
        >
          Loading teams...
        </p>
      ) : (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: '100%',
              padding: '0.75rem 2rem 0.75rem 1rem',
              borderRadius: '0',
              border: '1px solid var(--theme-elevation-300)',
              background: 'var(--theme-input-bg)',
              color: 'var(--theme-elevation-800)',
              fontSize: '1rem',
              lineHeight: '1.5',
              cursor: 'pointer',
              userSelect: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237a7d84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              backgroundSize: '16px',
            }}
          >
            {selectedTeam ? (
              <div>
                <div>{selectedTeam.teamName}</div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--theme-elevation-600)',
                    marginTop: '2px',
                  }}
                >
                  Players: {selectedTeam.players.map((p) => p.name).join(', ')}
                </div>
              </div>
            ) : (
              `-- Select ${label} --`
            )}
          </div>

          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: 'white',
                border: '1px solid var(--theme-elevation-300)',
                borderRadius: '0',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1000,
                background: 'var(--theme-input-bg)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {filteredTeams.map((team) => (
                <div key={team.id}>
                  <div
                    onClick={() => handleTeamSelect(team.teamName)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--theme-elevation-200)',
                      fontWeight: 'bold',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--theme-elevation-100)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {team.teamName}
                  </div>
                  <div style={{ padding: '4px 12px 12px 24px', fontSize: '0.875rem' }}>
                    {team.players.map((player) => (
                      <div
                        key={player.id}
                        onClick={(e) => handlePlayerClick(e, player.id, player.name)}
                        style={{
                          padding: '2px 0',
                          cursor: 'pointer',
                          color: 'var(--theme-elevation-700)',
                          textDecoration: 'underline',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--theme-primary-500)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--theme-elevation-700)'
                        }}
                      >
                        🧑‍🤝‍🧑 {player.name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MatchTeamSelectField
