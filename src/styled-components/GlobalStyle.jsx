import { createGlobalStyle } from 'styled-components';
import { baseTheme, lightTheme, darkTheme } from "../theme";

const GlobalStyle = createGlobalStyle`
    :root {
        --site-info-width: ${baseTheme.site_info_width};
        --radius-sm: ${baseTheme.button.border_radius.sm};
        --radius-md: ${baseTheme.button.border_radius.md};
        --radius-lg: ${baseTheme.button.border_radius.lg};
        --box-shadow: ${baseTheme.box.shadow};
        --box-radius: ${baseTheme.box.border_radius};
        --space-xl: ${baseTheme.layout.space.xl};
        --space-lg: ${baseTheme.layout.space.lg};
        --space-default: ${baseTheme.layout.space.default};
        --space-sm: ${baseTheme.layout.space.sm};
        --space-xs: ${baseTheme.layout.space.xs};
        --font-letter-space: ${baseTheme.font.letter_space};
        --color-warning: ${baseTheme.color.warning};
        --color-highlight-900: ${baseTheme.color.highlight[900]};
        --color-highlight-800: ${baseTheme.color.highlight[800]};
        --color-highlight-700: ${baseTheme.color.highlight[700]};
        --color-highlight-600: ${baseTheme.color.highlight[600]};
        --color-highlight-500: ${baseTheme.color.highlight[500]};
        --color-highlight-400: ${baseTheme.color.highlight[400]};
        --color-highlight-300: ${baseTheme.color.highlight[300]};
        --color-highlight-200: ${baseTheme.color.highlight[200]};
        --color-highlight-100: ${baseTheme.color.highlight[100]};
        --color-highlight-50: ${baseTheme.color.highlight[50]};
        --color-main-900: ${baseTheme.color.main[900]};
        --color-main-800: ${baseTheme.color.main[800]};
        --color-main-700: ${baseTheme.color.main[700]};
        --color-main-600: ${baseTheme.color.main[600]};
        --color-main-500: ${baseTheme.color.main[500]};
        --color-main-400: ${baseTheme.color.main[400]};
        --color-main-300: ${baseTheme.color.main[300]};
        --color-main-200: ${baseTheme.color.main[200]};
        --color-main-100: ${baseTheme.color.main[100]};
        --color-main-50: ${baseTheme.color.main[50]};

        /* default (light) theme values */
        --bg-color: ${lightTheme.background};
        --surface-color: ${lightTheme.surface};
        --surface-alt-color: ${lightTheme.surfaceAlt};
        --border-color: ${lightTheme.border};
        --text-color: ${lightTheme.text};
        --muted-text-color: ${lightTheme.mutedText};
        --accent-color: ${lightTheme.accent};
        --accent-hover: ${lightTheme.accentHover};
        --accent-text-color: ${lightTheme.accentText};
        --header-bg: ${lightTheme.headerBg};
        --header-text: ${lightTheme.headerText};
        --shadow-soft: ${lightTheme.shadowSoft};
        --shadow-strong: ${lightTheme.shadowStrong};
        --accent-glow: ${lightTheme.accentGlow};
        --color-scheme: light;
        --card-bg: rgba(255, 255, 255, 0.16);
        --card-border: ${lightTheme.border};
        --input-bg: ${lightTheme.surface};
        --input-bg-focus: rgba(255, 255, 255, 0.98);
        --input-border-hover: #cbd5e1;
    }

    [data-theme="dark"] {
        --bg-color: ${darkTheme.background};
        --surface-color: ${darkTheme.surface};
        --surface-alt-color: ${darkTheme.surfaceAlt};
        --border-color: ${darkTheme.border};
        --text-color: ${darkTheme.text};
        --muted-text-color: ${darkTheme.mutedText};
        --accent-color: ${darkTheme.accent};
        --accent-hover: ${darkTheme.accentHover};
        --accent-text-color: ${darkTheme.accentText};
        --header-bg: ${darkTheme.headerBg};
        --header-text: ${darkTheme.headerText};
        --shadow-soft: ${darkTheme.shadowSoft};
        --shadow-strong: ${darkTheme.shadowStrong};
        --accent-glow: ${darkTheme.accentGlow};
        --color-scheme: dark;
        --card-bg: rgba(15, 23, 42, 0.18);
        --card-border: rgba(255, 255, 255, 0.15);
        --input-bg: rgba(255, 255, 255, 0.08);
        --input-bg-focus: rgba(255, 255, 255, 0.15);
        --input-border-hover: rgba(255, 255, 255, 0.5);
    }

    body {
        background: var(--bg-color);
        color: var(--text-color);
        transition: background 0.25s ease, color 0.25s ease;
        color-scheme: var(--color-scheme);
    }

    .app-shell {
        min-height: 100vh;
        background: var(--bg-color);
        color: var(--text-color);
    }

    button,
    input,
    select,
    textarea {
        font-family: 'Noto Sans KR', sans-serif;
    }
`;

export default GlobalStyle;
