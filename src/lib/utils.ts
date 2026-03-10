import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Normalize string for accent/case-insensitive search */
export function normalize(str: string | null | undefined): string {
  if (!str) return ''
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Check if text contains query (accent & case insensitive) */
export function searchMatch(text: string | null | undefined, query: string): boolean {
  if (!text) return false
  return normalize(text).includes(normalize(query))
}
