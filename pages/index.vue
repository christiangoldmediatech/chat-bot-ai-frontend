<script setup lang="ts">
// Root redirect: authenticated users go to the admin dashboard, everyone else
// gets sent to /login.
const auth = useAuthStore()
if (auth.isAuthenticated) {
  await navigateTo('/admin', { replace: true })
} else {
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <div />
</template>
