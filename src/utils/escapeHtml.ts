/**
 * Escape a value for interpolation into one of the HTML email templates.
 *
 * The templates are built with template literals, so any user-supplied field
 * dropped into them lands as markup: a counselor's direct message or a
 * student's cancellation reason could carry a link or a whole block of HTML
 * into a WellMindly-branded email. Escape at the interpolation site.
 */
export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export default escapeHtml;
