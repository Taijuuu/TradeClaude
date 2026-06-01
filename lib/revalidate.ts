import { revalidatePath } from 'next/cache'

/**
 * Call after any trade mutation (create / update / delete).
 * Revalidates all pages that display trade data.
 */
export function revalidateTrades() {
  revalidatePath('/dashboard')
  revalidatePath('/trades')
  revalidatePath('/daily-stats')
  revalidatePath('/reports')
  revalidatePath('/strategies', 'layout')
}

/**
 * Call after notebook entry mutations.
 */
export function revalidateNotebook() {
  revalidatePath('/notebook')
  revalidatePath('/dashboard')
  revalidatePath('/daily-stats')
}

/**
 * Call after account or settings mutations.
 */
export function revalidateSettings() {
  revalidatePath('/settings')
  revalidatePath('/', 'layout')
}
