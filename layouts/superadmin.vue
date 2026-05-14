<template>
  <div class="min-h-screen flex bg-slate-900 text-slate-50">
    <aside class="w-64 bg-slate-950 border-r border-slate-800 p-4">
      <h2 class="text-sm uppercase tracking-wider text-slate-400">Super Admin</h2>
      <p class="mt-2 text-xs text-slate-500">Stub — implementado en Fase G.</p>
    </aside>
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-14 border-b border-slate-800 flex items-center px-6">
        <h1 class="text-sm font-medium">Plataforma</h1>
      </header>
      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
