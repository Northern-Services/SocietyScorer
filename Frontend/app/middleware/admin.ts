export default defineNuxtRouteMiddleware(async () => {
  try {
    const res: any = await $fetch('/api/auth/me')
    
    // If user is not authenticated or does not have an admin role (Site Admin / Developer), redirect them
    if (!res?.success || !res?.data?.role) {
      return navigateTo('/dashboard')
    }
    const { isAdminRole } = await import('@/utils/roles')
    if (!isAdminRole(res.data.role)) {
      return navigateTo('/dashboard')
    }
  } catch (err) {
    // If unauthorized or error fetching session, redirect to login
    return navigateTo('/login')
  }
})