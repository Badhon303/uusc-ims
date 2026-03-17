import type { Access } from 'payload'
import { User } from '@/payload-types'

export const isAdmin: Access<User> = ({ req }) => {
  return req.user?.role === 'admin'
}
