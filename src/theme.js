const baseTheme = {
    site_info_width: "350px",
    button: {
        border_radius: {
            sm: "4px",
            md: "8px",
            lg: "12px",
        },
    },
    box: {
        width_min: "320px",
        shadow: "0px 8px 26px 1px rgba(34, 34, 34, 0.05);",
        border_radius: "10px",
    },
    color: {
        warning: "tomato",
        highlight: {
            900: "#f96e01",
            800: "#fa8d02",
            700: "#fa9e03",
            600: "#fab104",
            500: "#fabe0c", // default
            400: "#fbc829",
            300: "#fbd34f",
            200: "#fcdf82",
            100: "#fdebb3",
            50: "#fef8e1",
        },
        main: {
            900: "#12273d",
            800: "#143756", // default
            700: "#194163",
            600: "#214a6e",
            500: "#285276",
            400: "#4b6986",
            300: "#6c8399",
            200: "#93a5b7",
            100: "#bdc9d4",
            50: "#e5e9ed",
        },
    },
    layout: {
        space: {
            xl: "40px",
            lg: "32px",
            default: "24px",
            sm: "16px",
            xs: "8px",
        },
    },
    font: {
        size: {
            default: "16px",
            xl: "32px",
            lg: "24px",
            sm: "12px",
        },
        letter_space: "-0.06em",
    },
};

const lightTheme = {
    ...baseTheme,
    name: "light",
    background: "#f3f4f6",
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",
    border: "#e5e7eb",
    text: "#0f172a",
    mutedText: "#475569",
    accent: baseTheme.color.highlight[500],
    accentHover: baseTheme.color.highlight[400],
    accentText: "#12273d",
    headerBg: baseTheme.color.main[800],
    headerText: "#f8fafc",
    shadowSoft: "0 8px 30px rgba(15, 23, 42, 0.08)",
    shadowStrong: "0 16px 60px rgba(15, 23, 42, 0.16)",
    accentGlow: "rgba(250, 190, 12, 0.24)",
};

const darkTheme = {
    ...baseTheme,
    name: "dark",
    background: "#0b1220",
    surface: "#0f172a",
    surfaceAlt: "#111827",
    border: "#1f2937",
    text: "#e2e8f0",
    mutedText: "#cbd5e1",
    accent: baseTheme.color.highlight[500],
    accentHover: baseTheme.color.highlight[400],
    accentText: "#0f172a",
    headerBg: "#0d1729",
    headerText: "#e2e8f0",
    shadowSoft: "0 12px 40px rgba(0, 0, 0, 0.45)",
    shadowStrong: "0 18px 70px rgba(0, 0, 0, 0.6)",
    accentGlow: "rgba(250, 190, 12, 0.18)",
};

export { baseTheme, lightTheme, darkTheme };
export const themes = { light: lightTheme, dark: darkTheme };
export default lightTheme;
