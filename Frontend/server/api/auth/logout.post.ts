import { deleteCookie, ok } from '../../utils/api'

export default defineEventHandler((event: any) => {
  deleteCookie(event, 'auth_user_id', { path: '/' })
  return ok()
})
