/**
 * MealForm Styling Constants
 * 
 * Extracted inline styles for better readability and maintainability.
 * Centralizes UI constants used throughout the MealForm component.
 * Makes it easier to update colors, spacing, and layout systematically.
 */

/**
 * Suggestion item styling for favorites autocomplete
 */
export const SUGGESTION_ITEM_STYLE = {
  display: "flex" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  width: "100%",
  padding: "10px 14px",
  background: "transparent",
  color: "#e2e8f0",
  border: "none",
  borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
  textAlign: "left" as const,
  cursor: "pointer",
  transition: "all 0.15s ease",
} as const;

/**
 * Suggestion panel container
 */
export const SUGGESTION_PANEL_STYLE = {
  position: "absolute" as const,
  zIndex: 20,
  top: "100%",
  left: 0,
  right: 0,
  background: "rgba(26, 26, 46, 0.98)",
  border: "1px solid rgba(139, 92, 246, 0.2)",
  borderRadius: 12,
  marginTop: 6,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.1)",
  maxHeight: 140,
  overflowY: "auto" as const,
  backdropFilter: "blur(10px)",
} as const;

/**
 * Suggestion item +button styling
 */
export const SUGGESTION_PLUS_BUTTON_STYLE = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "rgba(139, 92, 246, 0.15)",
  border: "1.5px solid rgba(139, 92, 246, 0.4)",
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  fontSize: 16,
  color: "#8b5cf6",
  flexShrink: 0,
} as const;

/**
 * Suggestion item name/title styling
 */
export const SUGGESTION_NAME_STYLE = {
  display: "flex" as const,
  flexDirection: "column" as const,
  flex: 1,
} as const;

/**
 * Suggestion item main text
 */
export const SUGGESTION_MAIN_TEXT_STYLE = {
  fontWeight: 600 as const,
  color: "#e2e8f0",
} as const;

/**
 * Suggestion item secondary text (calories/serving size)
 */
export const SUGGESTION_SECONDARY_TEXT_STYLE = {
  color: "#94a3b8",
  fontSize: "0.85rem",
} as const;

/**
 * Form actions row styling
 */
export const FORM_ACTIONS_STYLE = {
  display: "flex" as const,
  justifyContent: "space-between" as const,
  alignItems: "center" as const,
  gap: 12,
  marginTop: "1.5rem",
} as const;

/**
 * Form actions button group
 */
export const BUTTON_GROUP_STYLE = {
  display: "flex" as const,
  alignItems: "center" as const,
  gap: 8,
} as const;

/**
 * Favorites modal body styling
 */
export const MODAL_BODY_STYLE = {
  height: "70vh",
  maxHeight: "70vh",
  overflowY: "auto" as const,
  padding: "1.25rem 1.75rem",
  display: "flex" as const,
  flexDirection: "column" as const,
  gap: 12,
} as const;

/**
 * Search input styling in modal
 */
export const SEARCH_INPUT_STYLE = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #2b2b45",
  background: "#11172b",
  color: "#e2e8f0",
} as const;

/**
 * Favorites list item button styling
 */
export const FAVORITES_LIST_BUTTON_STYLE = {
  width: "100%",
  textAlign: "left" as const,
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #eee",
  background: "#232347",
  color: "#e2e8f0",
  cursor: "pointer",
  fontWeight: 500 as const,
} as const;

/**
 * Favorites list item name styling
 */
export const FAVORITES_LIST_NAME_STYLE = {
  fontSize: 16,
} as const;

/**
 * Favorites list item meta styling (calories, serving)
 */
export const FAVORITES_LIST_META_STYLE = {
  fontSize: 13,
  color: "#94a3b8",
} as const;

/**
 * Empty state message styling
 */
export const FAVORITES_LIST_EMPTY_STYLE = {
  color: "#888",
  textAlign: "center" as const,
  marginTop: 24,
} as const;

/**
 * Clear button styling
 */
export const CLEAR_BUTTON_STYLE = {
  background: "#334155",
} as const;
