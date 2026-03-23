import { isAdmin } from '@/utils/access/isAdmin'
import { CollectionConfig, Where } from 'payload'

export const TournamentMatches: CollectionConfig = {
  slug: 'tournament-matches',
  labels: {
    singular: '🫎 Tournament Match',
    plural: '🫎 Tournament Matches',
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'tournament',
      type: 'relationship',
      relationTo: 'tournaments',
      required: true,
    },

    // ✅ Team One
    {
      name: 'teamOne',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,
      filterOptions: ({ data }): Where | boolean => {
        if (!data?.tournament) return true

        return {
          tournament: {
            equals: data.tournament,
          },
        }
      },
    },

    // ✅ Team Two (only visible after teamOne is selected)
    {
      name: 'teamTwo',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,

      // ⭐ BONUS: Hide until teamOne is selected
      admin: {
        condition: (_, siblingData) => !!siblingData.teamOne,
      },

      filterOptions: ({ data }): Where | boolean => {
        if (!data?.tournament) return true

        const where: Where = {
          and: [
            {
              tournament: {
                equals: data.tournament,
              },
            },
            {
              id: {
                not_equals: data.teamOne,
              },
            },
          ],
        }

        return where
      },
    },

    {
      name: 'court',
      type: 'relationship',
      relationTo: 'courts',
      required: true,
    },

    // ✅ Winner (must be teamOne or teamTwo)
    {
      name: 'winner',
      type: 'relationship',
      relationTo: 'tournament-teams',
      required: true,

      filterOptions: ({ data }): Where | boolean => {
        if (!data?.teamOne || !data?.teamTwo) return false

        return {
          id: {
            in: [data.teamOne, data.teamTwo],
          },
        }
      },

      validate: (value: any, { data }: any) => {
        if (!value) return 'Winner is required'

        if (value !== data.teamOne && value !== data.teamTwo) {
          return 'Winner must be either Team One or Team Two'
        }

        return true
      },
    },

    {
      name: 'scheduledTime',
      type: 'date',
      required: true,
    },
    {
      name: 'teamOneScore',
      type: 'number',
      required: true,
    },
    {
      name: 'teamTwoScore',
      type: 'number',
      required: true,
    },
  ],
}
