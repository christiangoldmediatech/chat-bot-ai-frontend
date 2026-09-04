<template>
  <div class="relative min-h-screen flex bg-home-mesh text-pearl">
    <AdminSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <AdminHeader />
      <BillingBanner />
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 [&_h1.text-slate-900]:!text-pearl [&_h1.text-slate-900]:drop-shadow-sm [&_p.text-slate-500.max-w-2xl]:!text-white/85 [&_p.text-slate-500.max-w-2xl]:drop-shadow-sm">
        <slot />
      </main>
    </div>
  </div>
</template>
