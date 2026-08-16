import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import type { Config } from './payload-types'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { allowedOrigins } from './utils/cors/corsHandler'
import { Packages } from './collections/Packages'
import { Members } from './collections/Members'
import { Managers } from './collections/Managers'
import { Staffs } from './collections/Staffs'
import { Students } from './collections/Students'
import { Coaches } from './collections/Coaches'
import { MemberPayments } from './collections/MemberPayments'
import { StudentPayments } from './collections/StudentPayments'
import { StudentAttendance } from './collections/StudentAttendance'
import { StudentProgress } from './collections/StudentProgress'
import { CoachSalaries } from './collections/CoachSalaries'
import { TrainingGroups } from './collections/TrainingGroups'
import { Courts } from './collections/Courts'
import { MemberSchedules } from './collections/MemberSchedules'
import { TrainingSchedules } from './collections/TrainingSchedules'
import { Sponsors } from './collections/Sponsors'
import { CourtBookings } from './collections/CourtBookings'
import { Tournaments } from './collections/Tournaments'
import { TournamentRegistrations } from './collections/TournamentRegistrations'
import { TournamentTeams } from './collections/TournamentTeams'
import { TournamentMatches } from './collections/TournamentMatches'
import { TournamentResults } from './collections/TournamentResults'
import { BookingPayments } from './collections/BookingPayments'
import { OtherIncomes } from './collections/OtherIncomes'
import { Expenditures } from './collections/Expenditure'
import { withSuspensionGuard } from './utils/access/withTenantAccess'
import { isSuperAdminField } from './utils/access/isSuperAdmin'
import { Tenants } from './collections/Tenants'
import { SubscriptionPlans } from './collections/SubscriptionPlans'
import { SubscriptionInvoices } from './collections/SubscriptionInvoices'
import { SubscriptionEvents } from './collections/SubscriptionEvents'
import { Notifications } from './collections/Notifications'
import { AuditLogs } from './collections/AuditLogs'
import { Payments } from './collections/Payments'
import { PlatformSettings } from './globals/PlatformSettings'
import { EnforceTenantSubscriptions } from './jobs/tasks/enforceTenantSubscriptions'
import { SendBillingReminders } from './jobs/tasks/sendBillingReminders'
import { DispatchPendingNotifications } from './jobs/tasks/dispatchPendingNotifications'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Add your own logo and icon here
    components: {
      beforeDashboard: [
        './components/DashboardIncomeReports',
        './components/DashboardExpenseReports',
      ],
      beforeNavLinks: ['./components/DashboardNavLink'],
      // Rendered in the app header, immediately left of the account avatar
      actions: ['./components/NotificationBell'],
      afterLogin: ['./components/PoweredBy'],
      logout: {
        Button: './components/PoweredByAfterLogout',
      },
      graphics: {
        Icon: '/graphics/Icon/index.tsx#Icon',
        Logo: '/graphics/Logo/index.tsx#Logo',
      },
    },
    // Add your own meta data here
    meta: {
      description: 'UUSC Admin Panel',
      icons: [
        {
          rel: 'icon',
          type: 'image/x-icon',
          url: '/assets/favicon.ico',
        },
      ],
      titleSuffix: 'UUSC - Admin Panel',
    },
  },
  collections: [
    Tenants,
    SubscriptionPlans,
    SubscriptionInvoices,
    SubscriptionEvents,
    Users,
    Media,
    ...[
      Courts,
      Packages,
      Students,
      Members,
      Coaches,
      CoachSalaries,
      Managers,
      Staffs,
      Expenditures,
      MemberPayments,
      StudentPayments,
      BookingPayments,
      Payments,
      Sponsors,
      OtherIncomes,
      TrainingGroups,
      StudentAttendance,
      StudentProgress,
      Tournaments,
      TournamentRegistrations,
      TournamentTeams,
      TournamentMatches,
      TournamentResults,
      TrainingSchedules,
      MemberSchedules,
      CourtBookings,
      Notifications,
      AuditLogs,
    ].map(withSuspensionGuard),
  ],
  globals: [PlatformSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  graphQL: {
    disable: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // Sensible defaults for a multi-tenant production workload. Override
      // via environment variables when the database can accept more/fewer.
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30_000),
      connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECT_TIMEOUT || 5_000),
    },
  }),
  sharp,
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_USER || 'info@uusc.com',
    defaultFromName: process.env.FROM_NAME || 'UUSC',
    // Nodemailer transportOptions
    transportOptions: {
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'kathlyn.beier77@ethereal.email',
        pass: process.env.SMTP_PASS || 'ask15M92beKzaGGpzj',
      },
    },
  }),
  plugins: [
    multiTenantPlugin<Config>({
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) =>
        Boolean((user as { isSuperAdmin?: boolean } | null)?.isSuperAdmin),
      useTenantsCollectionAccess: false,
      useTenantsListFilter: false,
      // Tenant membership is a platform concern: only super admins may assign it.
      // Read stays open so tenant scoping (and `saveToJWT`) keeps working.
      tenantsArrayField: {
        includeDefaultField: true,
        arrayFieldAccess: {
          create: isSuperAdminField,
          update: isSuperAdminField,
        },
        tenantFieldAccess: {
          create: isSuperAdminField,
          update: isSuperAdminField,
        },
      },
      collections: {
        courts: {},
        packages: {},
        students: {},
        members: {},
        coaches: {},
        'coach-salaries': {},
        managers: {},
        staffs: {},
        expenditures: {},
        'member-payments': {},
        'student-payments': {},
        'booking-payments': {},
        payments: {},
        sponsors: {},
        'other-incomes': {},
        'training-groups': {},
        'student-attendance': {},
        'student-progress': {},
        tournaments: {},
        'tournament-registrations': {},
        'tournament-teams': {},
        'tournament-matches': {},
        'tournament-results': {},
        'training-schedules': {},
        'member-schedules': {},
        'court-bookings': {},
        notifications: {},
        'audit-logs': {},
      },
    }),
  ],
  i18n: {
    translations: {
      en: {
        general: {
          payloadSettings: ' ', // Setting this to empty removes the text
        },
      },
    },
  },
  jobs: {
    tasks: [EnforceTenantSubscriptions, SendBillingReminders, DispatchPendingNotifications],
    autoRun: [
      {
        cron: '* * * * *', // check every minute for scheduled + queued billing jobs
        queue: 'billing',
        limit: 50,
      },
      {
        cron: '* * * * *', // check every minute for queued notification jobs
        queue: 'notifications',
        limit: 100,
      },
    ],
  },
  cors: allowedOrigins,
  csrf: allowedOrigins,
  cookiePrefix: 'uusc',
})
