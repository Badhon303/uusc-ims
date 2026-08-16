import type { Access } from 'payload'
import { User } from '@/payload-types'
import { getCurrentUser } from '@/utils/access/currentUser'

export const isAdmin: Access<User> = ({ req }) => {
  const user = getCurrentUser(req)

  return user?.isSuperAdmin === true || user?.role === 'admin'
}
