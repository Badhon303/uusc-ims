'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useField } from '@payloadcms/ui'

type Props = {
  fieldName: 'teamOne' | 'teamTwo'
  label: string
  excludeValue?: string
}

const TeamSelectField: React.FC<Props> = ({ fieldName, label, excludeValue }) => {
  const { value, setValue } = useField<string>({ path: fieldName })

  // Watch the tournament field
  const tournament = useFormFields(([fields]) => fields['tournament']?.value as string)

  const [teams, setTeams] = useState<{ id: string; teamName: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tournament) {
      setTeams([])
      setValue('')
      return
    }

    setLoading(true)

    fetch(`/api/tournament-matches/team-names?tournamentId=${tournament}`)
      .then((res) => res.json())
      .then((data) => {
        // Exclude the already-selected team (for teamTwo and winner)
        const filtered = excludeValue
          ? data.teams.filter((t: any) => t.teamName !== excludeValue)
          : data.teams

        setTeams(filtered)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tournament, excludeValue])

  if (!tournament) return null

  return (
    <div className="field-type">
      <label className="field-label">{label}</label>
      {loading ? (
        <p>Loading teams...</p>
      ) : (
        <select
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px' }}
        >
          <option value="">-- Select {label} --</option>
          {teams.map((team) => (
            <option key={team.id} value={team.teamName}>
              {team.teamName}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

export default TeamSelectField
