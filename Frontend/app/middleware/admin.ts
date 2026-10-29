export default defineNuxtRouteMiddleware(async () => {
  try {
    const res: any = await $fetch('/api/auth/me')
    
    // If user is not authenticated or is not an ADMIN, redirect them
    if (!res?.success || res?.data?.role !== 'ADMIN') {
      return navigateTo('/dashboard')
    }
  } catch (err) {
    // If unauthorized or error fetching session, redirect to login
    return navigateTo('/login')
  }
})