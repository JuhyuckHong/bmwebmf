import { useState, useEffect, useRef, useCallback } from "react";
import { decodeJwt } from "jose";
import Cookies from "js-cookie";
import {
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation,
} from "react-router-dom";
import Login from "./components/Login";
import Logout from "./components/Logout";
import AllSites from "./components/AllSites";
import GlobalStyle from './styled-components/GlobalStyle';
import { API } from "./API";
import "./App.css";
import "./CSS/Admin.css";
import SingleSite from "./components/SingleSite";
import Signup from "./components/Signup";
import PendingUsers from "./components/PendingUsers";
import UserPermission from "./components/UserPermission";
import WidthAdjuster from "./components/WidthAdjuster";
import LogsPage from "./components/LogsPage";
import ControlPage from "./components/ControlPage";
import { SortingStyle } from "./styled-components/allsites";
import { KeyboardNavigationProvider } from "./context";

const thumbnailIntervalMs = Number(import.meta.env.REACT_APP_THUMBNAIL_INTERVAL) || 60000;
const apiBaseUrl = import.meta.env.REACT_APP_API_URL;

const getInitialTheme = () => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("bm-theme");
    if (saved === "light" || saved === "dark") return saved;
    const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
};

const ThemeToggleButton = () => {
    const [themeMode, setThemeMode] = useState(getInitialTheme);

    useEffect(() => {
        if (typeof window === "undefined") return;
        document.documentElement.setAttribute("data-theme", themeMode);
        localStorage.setItem("bm-theme", themeMode);
    }, [themeMode]);

    const handleThemeToggle = () =>
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));

    return (
        <button
            type="button"
            className={`pill-button theme-toggle ${themeMode}`}
            aria-pressed={themeMode === "dark"}
            aria-label="테마 전환"
            onClick={handleThemeToggle}>
            <span className="mode-indicator" aria-hidden="true">
                {themeMode === "dark" ? "🌙" : "☀️"}
            </span>
            <div className="mode-copy">
                <span className="mode-label">테마</span>
            </div>
        </button>
    );
};

function App() {
    const [auth, setAuth] = useState(false);
    const [admin, setAdmin] = useState(false);
    const [reload, setReload] = useState(false);
    const [authSites, setAuthSites] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [sortType, setSortType] = useState('name'); // 'name' | 'device' | 'status'
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [thumbnails, setThumbnails] = useState([]);
    const [siteInformation, setSiteInformation] = useState({});
    const [staticURLs, setStaticURLs] = useState({});
    const staticCacheRef = useRef({});

    const navigate = useNavigate();
    const location = useLocation();
    const isAdminPage =
        location.pathname.startsWith("/setting") ||
        location.pathname.startsWith("/logs") ||
        location.pathname.startsWith("/control");
    const isAllPage = location.pathname === "/all";
    const goToAllSites = () => navigate("/all");

    useEffect(() => {
        const token = Cookies.get("BM");

        if (!token) {
            setAuth(false);
            setAdmin(false);
            setAuthSites([]);
            setAuthChecked(true);
            return;
        }

        try {
            if (decodeJwt(token).exp < parseInt(Date.now() / 1000)) {
                Cookies.remove("BM");
                setAuth(false);
                setAdmin(false);
                setAuthSites([]);
                setAuthChecked(true);
                return;
            }
        } catch (error) {
            Cookies.remove("BM");
            setAuth(false);
            setAdmin(false);
            setAuthSites([]);
            setAuthChecked(true);
            return;
        }

        API.auth({ Authorization: token })
            .then((res) => {
                const user = res?.data.user;
                if (!user) return;
                const sites = Array.isArray(user?.sites)
                    ? [...user.sites].sort()
                    : [];
                setAdmin(user.class === user.username);
                setAuth(true);
                setAuthSites(sites);
            })
            .catch((err) => {
                console.log("error in auth", err);
                Cookies.remove("BM");
                setAuth(false);
                setAdmin(false);
                setAuthSites([]);
            })
            .finally(() => setAuthChecked(true));
    }, [auth]);

    useEffect(() => {
        if (!auth) {
            setAdmin(false);
            setAuthSites([]);
        }
    }, [auth]);

    const clearStaticCache = useCallback(() => {
        Object.values(staticCacheRef.current).forEach((entry) => {
            if (entry?.objectURL?.startsWith("blob:")) {
                URL.revokeObjectURL(entry.objectURL);
            }
        });
        staticCacheRef.current = {};
        setStaticURLs({});
    }, []);

    const fetchAllSitesData = useCallback(async () => {
        const headers = { Authorization: Cookies.get("BM") };
        try {
            const [thumbRes, infoRes] = await Promise.all([
                API.getThumbnails(headers),
                API.getAllInformation(headers),
            ]);
            setThumbnails(thumbRes.data);
            setSiteInformation(infoRes.data);
        } catch (err) {
            console.error("error fetching sites data", err);
        }
    }, []);

    useEffect(() => {
        if (!auth) {
            setThumbnails([]);
            setSiteInformation({});
            clearStaticCache();
            return;
        }

        fetchAllSitesData();

        // Only refresh periodically when on the all sites page
        if (!isAllPage) return;

        const intervalMs = thumbnailIntervalMs;
        const intervalId = setInterval(fetchAllSitesData, intervalMs);

        return () => clearInterval(intervalId);
    }, [auth, reload, fetchAllSitesData, clearStaticCache, isAllPage]);

    // Keep static thumbnails cached across navigation and update only when the source url changes.
    useEffect(() => {
        if (!auth) {
            clearStaticCache();
            return;
        }

        if (!thumbnails.length) {
            clearStaticCache();
            return;
        }

        const validSites = new Set(thumbnails.map((thumb) => thumb.site));
        Object.keys(staticCacheRef.current).forEach((site) => {
            if (!validSites.has(site)) {
                const cached = staticCacheRef.current[site];
                if (cached?.objectURL?.startsWith("blob:")) {
                    URL.revokeObjectURL(cached.objectURL);
                }
                delete staticCacheRef.current[site];
            }
        });

        const fetchStaticURLs = async () => {
            const headers = { Authorization: Cookies.get("BM") };
            const nextCache = { ...staticCacheRef.current };
            const updates = {};

            for (const thumbnail of thumbnails) {
                const cached = nextCache[thumbnail.site];
                // if (cached && cached.source === thumbnail.url) continue;

                try {
                    const cacheBuster = `?_t=${Date.now()}`;
                    const response = await API.getStatic(
                        headers,
                        thumbnail.url + cacheBuster,
                    );
                    const objectURL = URL.createObjectURL(response.data);

                    if (
                        cached?.objectURL &&
                        cached.objectURL.startsWith("blob:") &&
                        cached.objectURL !== objectURL
                    ) {
                        URL.revokeObjectURL(cached.objectURL);
                    }

                    nextCache[thumbnail.site] = {
                        source: thumbnail.url,
                        objectURL,
                    };

                    updates[thumbnail.site] = objectURL;
                } catch (err) {
                    const fallback = apiBaseUrl + "/static/no_image_today.jpg";

                    nextCache[thumbnail.site] = {
                        source: thumbnail.url,
                        objectURL: fallback,
                    };

                    updates[thumbnail.site] = fallback;
                }
            }

            staticCacheRef.current = nextCache;
            if (Object.keys(updates).length) {
                setStaticURLs((prev) => {
                    const merged = { ...prev, ...updates };
                    const prevKeys = Object.keys(prev);
                    const mergedKeys = Object.keys(merged);
                    if (
                        prevKeys.length === mergedKeys.length &&
                        prevKeys.every((k) => merged[k] === prev[k])
                    ) {
                        return prev; // no actual change
                    }
                    return merged;
                });
            }
            // ensure we propagate existing cache for sites without updates
            setStaticURLs((prev) => {
                const full = {};
                Object.entries(nextCache).forEach(([site, entry]) => {
                    full[site] = entry.objectURL;
                });
                const prevKeys = Object.keys(prev);
                const fullKeys = Object.keys(full);
                if (
                    prevKeys.length === fullKeys.length &&
                    prevKeys.every((k) => full[k] === prev[k])
                ) {
                    return prev;
                }
                return full;
            });
        };

        fetchStaticURLs();
    }, [auth, thumbnails, clearStaticCache]);

    const ProtectedRoute = ({ children, requireAdmin = false }) => {
        if (!authChecked) return null;
        if (!auth) {
            return (
                <Navigate
                    to="/login"
                    state={{ from: location }}
                    replace
                />
            );
        }

        if (requireAdmin && !admin) {
            return <Navigate to="/" replace />;
        }

        return children;
    };

    const handleAdminToggle = () => {
        if (!admin) return;
        navigate(isAdminPage ? "/all" : "/setting");
    };

    const handleLoginSuccess = (redirectTo = "/all") => {
        navigate(redirectTo, { replace: true });
    };

    const handleSelectSite = (siteName) =>
        navigate(`/site/${encodeURIComponent(siteName)}`);

    return (
        <KeyboardNavigationProvider>
        <div className="app-shell">
            <GlobalStyle />
            {auth && (
                <div className="user">
                    <button
                        type="button"
                        className="ci-background"
                        aria-label="전체 현장 보기"
                        onClick={goToAllSites}
                    />
                    <div className="header-center">
                        {isAllPage && (
                            <SortingStyle className="header-controls">
                                <div className="control-group">
                                    <span className="control-label">정렬</span>
                                    <button
                                        className="control-btn"
                                        onClick={() => setSortType((prev) =>
                                            prev === 'name' ? 'device' : prev === 'device' ? 'status' : 'name'
                                        )}>
                                        {sortType === 'name' ? "🏗️ 현장이름" : sortType === 'device' ? "🔢 모듈번호" : "🚥 현장상태"}
                                    </button>
                                </div>
                                <WidthAdjuster />
                            </SortingStyle>
                        )}
                    </div>
                    <div className="control-btns">
                        {isAllPage && (
                            <button
                                type="button"
                                className="pill-button sort-icon-btn"
                                onClick={() => setSortType((prev) =>
                                    prev === 'name' ? 'device' : prev === 'device' ? 'status' : 'name'
                                )}
                                aria-label={
                                    sortType === 'name' ? "모듈번호 순으로 정렬" :
                                    sortType === 'device' ? "현장상태 순으로 정렬" : "현장이름 순으로 정렬"
                                }
                                title={
                                    sortType === 'name' ? "모듈번호 순으로 정렬" :
                                    sortType === 'device' ? "현장상태 순으로 정렬" : "현장이름 순으로 정렬"
                                }>
                                <span className="sort-icon" aria-hidden="true">
                                    {sortType === 'name' ? "🏗️" : sortType === 'device' ? "#" : "🚦"}
                                </span>
                            </button>
                        )}
                        <ThemeToggleButton />
                        <button
                            type="button"
                            className="pill-button shortcut-btn"
                            onClick={() => setShowKeyboardHelp(true)}
                            aria-label="키보드 단축키">
                            <span className="btn-icon" aria-hidden="true">⌨️</span>
                            <span className="btn-label">단축키</span>
                        </button>
                        {admin && (
                            <button
                                className="pill-button admin-toggle"
                                onClick={handleAdminToggle}
                                aria-label={isAdminPage ? "모니터 화면으로 이동" : "설정 화면으로 이동"}>
                                <span className="btn-icon" aria-hidden="true">
                                    {isAdminPage ? "🖥️" : "⚙️"}
                                </span>
                                <span className="btn-label">
                                    {isAdminPage ? "모니터" : "세팅"}
                                </span>
                            </button>
                        )}
                            <Logout
                                className="pill-button logout-btn"
                                icon="👋"
                                label="로그아웃"
                                ariaLabel="로그아웃"
                                setAuth={setAuth}
                            />
                        </div>
                    </div>
                )}

            {showKeyboardHelp && (
                <div className="keyboard-help-overlay" onClick={() => setShowKeyboardHelp(false)}>
                    <div className="keyboard-help-modal" onClick={e => e.stopPropagation()}>
                        <h3>키보드 단축키</h3>
                        <div className="shortcut-group">
                            <h4>All (전체 현장)</h4>
                            <div className="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><span>썸네일 탐색</span></div>
                            <div className="shortcut-row"><kbd>Enter</kbd><span>선택한 현장 열기</span></div>
                            {admin && <div className="shortcut-row"><kbd>M</kbd><span>요약보기 열기</span></div>}
                        </div>
                        <div className="shortcut-group">
                            <h4>Single (개별 현장)</h4>
                            <div className="shortcut-row"><kbd>←</kbd><kbd>→</kbd><span>이전/다음 시간</span></div>
                            <div className="shortcut-row"><kbd>↑</kbd><kbd>↓</kbd><span>이전/다음 날짜</span></div>
                            <div className="shortcut-row"><kbd>[</kbd><kbd>]</kbd><span>이전/다음 현장</span></div>
                            <div className="shortcut-row"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><span>뷰 모드 전환</span></div>
                        </div>
                        <div className="shortcut-group">
                            <h4>전역</h4>
                            <div className="shortcut-row"><kbd>H</kbd><span>전체 현장으로 이동</span></div>
                            <div className="shortcut-row"><kbd>ESC</kbd><span>뒤로가기 / 닫기</span></div>
                        </div>
                        <button className="close-help-btn" onClick={() => setShowKeyboardHelp(false)}>닫기</button>
                    </div>
                </div>
            )}

            <div className="main-content">
                <Routes>
                    <Route
                        path="/login"
                        element={
                            auth ? (
                                <Navigate to="/all" replace />
                            ) : (
                                <div className="landing">
                                    <Login
                                        setAuth={setAuth}
                                        onLoginSuccess={() =>
                                            handleLoginSuccess(
                                                location.state?.from
                                                    ?.pathname || "/all",
                                            )
                                        }
                                        onSwitchToSignup={() =>
                                            navigate("/signup")
                                        }
                                    />
                                </div>
                            )
                        }
                    />
                    <Route
                        path="/signup"
                        element={
                            auth ? (
                                <Navigate to="/all" replace />
                            ) : (
                                <div className="landing">
                                    <Signup
                                        onSwitchToLogin={() =>
                                            navigate("/login")
                                        }
                                    />
                                </div>
                            )
                        }
                    />
                    <Route
                        path="/site/:siteId"
                        element={
                            <ProtectedRoute>
                                <div className="display">
                                    <SingleSite authSites={authSites} />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/setting"
                        element={
                            <ProtectedRoute requireAdmin>
                                <div className="display">
                                    <div className="admin-page">
                                        <div className="user-permission">
                                            <UserPermission
                                                reload={reload}
                                                setReload={setReload}
                                            />
                                        </div>
                                        <div className="user-approval">
                                            <PendingUsers
                                                setReload={setReload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute requireAdmin>
                                <div className="display">
                                    <LogsPage />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <Navigate to={auth ? "/all" : "/login"} replace />
                        }
                    />
                    <Route
                        path="/all"
                        element={
                            <ProtectedRoute>
                                <div className="display">
                                    <AllSites
                                        admin={admin}
                                        sortType={sortType}
                                        thumbnails={thumbnails}
                                        siteInformation={siteInformation}
                                        staticURLs={staticURLs}
                                        onSelectSite={handleSelectSite}
                                    />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/control"
                        element={
                            <ProtectedRoute requireAdmin>
                                <div className="display">
                                    <ControlPage />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="*"
                        element={
                            <Navigate to={auth ? "/all" : "/login"} replace />
                        }
                    />
                </Routes>
            </div>
        </div>
        </KeyboardNavigationProvider>
    );
}

export default App;
