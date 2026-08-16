import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

const run = async () => {
  const payload = await getPayload({ config })

  const migrateCollection = async (
    collection: 'member-payments' | 'student-payments' | 'booking-payments',
    payerType: 'member' | 'student' | 'guest',
    context: 'membership' | 'registration-fee' | 'court-booking',
  ) => {
    const result = await payload.find({
      collection,
      limit: 500,
      pagination: false,
      depth: 0,
    })

    for (const doc of result.docs as any[]) {
      const baseData = {
        tenant: doc.tenant,
        payerType,
        payer: doc.user || doc.student || doc.booking || null,
        context,
        contextRefId: String(doc.id),
      }

      if (collection === 'booking-payments') {
        await payload.create({
          collection: 'payments' as never,
          data: {
            ...baseData,
            amount: doc.totalAmount || 0,
            paymentMethod: 'cash',
            status: doc.paymentStatus === 'paid' ? 'paid' : 'due',
            dueDate: doc.createdAt,
            paidAt: doc.paymentStatus === 'paid' ? doc.updatedAt : null,
            gatewayStatus: doc.paymentStatus,
          },
        } as any)

        continue
      }

      if (doc.registrationFee) {
        await payload.create({
          collection: 'payments' as never,
          data: {
            ...baseData,
            context: 'registration-fee',
            amount: doc.registrationFee,
            paymentMethod: 'cash',
            status: 'paid',
            dueDate: doc.registrationDate,
            paidAt: doc.registrationDate,
            gatewayStatus: 'migrated',
          },
        } as any)
      }

      for (const payment of doc.payments || []) {
        await payload.create({
          collection: 'payments' as never,
          data: {
            ...baseData,
            amount: payment.amount || 0,
            paymentMethod:
              payment.paymentMethod === 'mobile-banking' ? 'bkash' : payment.paymentMethod || 'cash',
            status: payment.status === 'paid' ? 'paid' : 'due',
            dueDate: payment.paymentMonth,
            paidAt: payment.status === 'paid' ? payment.paymentMonth : null,
            gatewayTransactionId: payment.transactionRef || null,
            gatewayStatus: payment.status,
          },
        } as any)
      }
    }
  }

  await migrateCollection('member-payments', 'member', 'membership')
  await migrateCollection('student-payments', 'student', 'membership')
  await migrateCollection('booking-payments', 'guest', 'court-booking')
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
