/**
 * Utility function to safely add cursor-pointer class
 * This ensures consistent cursor behavior across SSR and client-side rendering
 */
export const getCursorPointerClass = (): string => {
  return 'cursor-pointer';
};

/**
 * Utility function to conditionally add cursor-pointer class
 * @param baseClasses - Base CSS classes
 * @param addCursor - Whether to add cursor-pointer (default: true)
 * @returns Combined CSS classes with conditional cursor-pointer
 */
export const withCursorPointer = (baseClasses: string, addCursor: boolean = true): string => {
  const cursorClass = addCursor ? getCursorPointerClass() : '';
  return `${baseClasses} ${cursorClass}`.trim();
};
