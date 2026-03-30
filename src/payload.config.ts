import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

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
import { Expenditures } from './collections/Expenditures'

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
    // FInance
    // Settings
    Users,
    Media,
    Courts,
    Packages,
    // Profiles
    Students,
    Members,
    Coaches,
    // BackOffice
    CoachSalaries,
    Managers,
    Staffs,
    Expenditures,
    // Payments & Packages
    MemberPayments,
    StudentPayments,
    BookingPayments,
    Sponsors,
    OtherIncomes,
    // Training
    TrainingGroups,
    StudentAttendance,
    StudentProgress,
    // Tournament
    Tournaments,
    TournamentRegistrations,
    TournamentTeams,
    TournamentMatches,
    TournamentResults,
    // Schedule
    TrainingSchedules,
    MemberSchedules,
    CourtBookings,
  ],
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
  plugins: [],
  i18n: {
    translations: {
      en: {
        general: {
          payloadSettings: ' ', // Setting this to empty removes the text
        },
      },
    },
  },
  cors: allowedOrigins,
  csrf: allowedOrigins,
  cookiePrefix: 'uusc',
})
