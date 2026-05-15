<script setup lang="ts" generic="T extends Record<string, unknown>">
interface Column<Row> {
  key: string
  label: string
  format?: (row: Row) => string | number | null
}

defineProps<{
  rows: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-2xl bg-white/70 backdrop-blur-xl ring-1 ring-white/50 shadow-glass">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-600">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-left font-medium px-4 py-3"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td :colspan="columns.length" class="px-4 py-6 text-center">
            <SpinnerInline />
          </td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td :colspan="columns.length" class="px-4 py-6 text-center text-slate-400">
            {{ emptyMessage ?? 'No data' }}
          </td>
        </tr>
        <tr
          v-for="(row, i) in rows"
          v-else
          :key="i"
          class="border-t border-slate-100"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-slate-700"
          >
            {{ col.format ? col.format(row) : (row[col.key] as string | number | null) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
