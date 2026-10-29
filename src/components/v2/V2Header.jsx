import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logout from "../Logout";

const readTheme = () => {
    try {
        const saved = localStorage.getItem("bm-theme");
        if (saved === "light" || saved === "dark") return saved;
    } catch {
        // storage blocked: fall back to the OS setting
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const ADMIN_PAGES = [
    { path: "/v2/modules", icon: "💻", label: "모듈 정보" },
    { path: "/v2/control", icon: "🎛️", label: "설정 변경" },
    { path: "/v2/timeline", icon: "📅", label: "타임라인" },
    { path: "/v2/cameras", icon: "📷", label: "카메라 정보" },
    { path: "/v2/logs", icon: "📜", label: "로그" },
    { path: "/v2/users", icon: "⚙️", label: "사용자 설정" },
];

// v2 화면 공통 상단 바: 뒤로가기, 제목, 메뉴(아래에서 올라오는 시트)
export default function V2Header({ title, subtitle, onBack, admin, setAuth, legacyPath = "/all", children }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [theme, setTheme] = useState(readTheme);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        try {
            localStorage.setItem("bm-theme", theme);
        } catch {
            // ignore
        }
    }, [theme]);

    const go = (path) => {
        setMenuOpen(false);
        navigate(path);
    };

    return (
        <header className="v2-header">
            <div className="v2-header-row">
                {onBack ? (
                    <button type="button" className="v2-icon-btn" onClick={onBack} aria-label="뒤로">
                        ‹
                    </button>
                ) : (
                    <span className="v2-logo" aria-hidden="true" />
                )}
                <div className="v2-header-title">
                    <h1>{title}</h1>
                    {subtitle && <span>{subtitle}</span>}
                </div>
                <button type="button" className="v2-icon-btn" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기">
                    ☰
                </button>
            </div>
            {children}

            {menuOpen && (
                <div className="v2-sheet-overlay" onClick={() => setMenuOpen(false)}>
                    <div className="v2-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="메뉴">
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <button type="button" className="v2-menu-item"
                            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
                            <span aria-hidden="true">{theme === "dark" ? "🌙" : "☀️"}</span>
                            {theme === "dark" ? "다크 모드" : "라이트 모드"}
                        </button>
                        <button type="button" className="v2-menu-item" onClick={() => go("/v2/all")}>
                            <span aria-hidden="true">🏗️</span>전체 현장
                        </button>
                        {admin && ADMIN_PAGES.map((page) => (
                            <button key={page.path} type="button" className="v2-menu-item" onClick={() => go(page.path)}>
                                <span aria-hidden="true">{page.icon}</span>{page.label}
                            </button>
                        ))}
                        <button type="button" className="v2-menu-item" onClick={() => go(legacyPath)}>
                            <span aria-hidden="true">🖥️</span>기존 화면으로 보기
                        </button>
                        <Logout
                            className="v2-menu-item"
                            icon="👋"
                            label="로그아웃"
                            ariaLabel="로그아웃"
                            setAuth={setAuth}
                            onLogout={() => setMenuOpen(false)}
                        />
                        <button type="button" className="v2-menu-close" onClick={() => setMenuOpen(false)}>
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
