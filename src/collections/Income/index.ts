import { CollectionConfig } from 'payload'

export const Income: CollectionConfig = {
  slug: 'income',
  admin: {
    useAsTitle: 'title',
    group: '✨ Finance',
  },
  access: {
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
    },
    {
      name: 'description',
      type: 'text',
    },
  ],
  endpoints: [
    {
      path: '/incomes',
      method: 'get',
      handler: async (req: any) => {
        // Get all income from the collections (member-payments, student-payments, booking-payments, sponsors, income) by month and year if month and year not passed get all income.
        const { month, year } = req.query
        const stats = await req.payload.db.drizzle.execute(`SELECT 
           `)
        const result = stats.rows[0] || {
          membershipRegistrationFee: 0,
          membershipFee: 0,
          studentRegistrationFee: 0,
          studentFee: 0,
          bookingFee: 0,
          sponsors: 0,
          income: 0,
        }
        return Response.json(result)
      },
    },
  ],
}
