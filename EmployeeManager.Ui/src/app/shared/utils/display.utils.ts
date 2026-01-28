/**
 * Utility functions for displaying localized names
 */

export function getDepartmentDisplayName(name: string | null | undefined): string {
  if (!name) return 'Резерв';
  if (name === 'Reserve' || name === 'Global Reserve') return 'Резерв';
  return name;
}

export function getPositionDisplayName(title: string | null | undefined): string {
  if (!title) return 'Без Посади';
  if (title === 'Unemployed') return 'Без Посади';
  return title;
}

export function getSpecializationDisplayName(name: string | null | undefined): string {
  if (!name) return 'Не вказано';
  if (name === 'Intern') return 'Без Спец.';
  return name;
}

/**
 * Formats a date string to DD.MM.YYYY format
 * @param dateString - Date string in ISO format or any valid date string
 * @returns Formatted date string (DD.MM.YYYY) or 'Не вказано' if invalid
 */
export function formatDateDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return 'Не вказано';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Не вказано';
    
    // Format as DD.MM.YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  } catch {
    return 'Не вказано';
  }
}
