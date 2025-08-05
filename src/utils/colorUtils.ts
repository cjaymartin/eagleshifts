/**
 * Utility functions for color manipulation
 */

/**
 * Determines if text should be black or white based on background color
 * @param backgroundColor - The background color in hex format (e.g., "#RRGGBB")
 * @returns The text color in hex format ("#000000" for black or "#ffffff" for white)
 */
export const getTextColor = (backgroundColor: string): string => {
    // Remove the # if it exists
    const color = backgroundColor.replace('#', '');

    // Parse the color components
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    // Calculate relative luminance using the formula for perceived brightness
    // https://www.w3.org/TR/WCAG20-TECHS/G18.html
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Use black text if the background is light, white text if it's dark
    return luminance > 0.5 ? '#000000' : '#ffffff';
};