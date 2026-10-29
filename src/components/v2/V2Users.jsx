import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import "./v2.css";
import "./V2Users.css";

const authHeader = () => ({ Authorization: Cookies.get("BM") });

const siteLabel = (site) => String(site).replaceAll("_", " ");

const sameSet = (a, b) => a.length === b.length && a.every((v) => b.includes(v));

// 기존 화면과 같이 username === class 인 계정은 상태 변경 대상에서 뺀다
const isManaged = (user) => user.username !== user.class;

const STATE_FILTERS = [
    { key: "all", label: "전체" },
    { key: "active", label: "활성" },
    { key: "inactive", label: "비활성" },
];

export default function V2Users({ admin, setAuth }) {
    const [reload, setReload] = useState(false);
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState(null);
    const [allSites, setAllSites] = useState([]);
    const [pendingUsers, setPendingUsers] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [pendingError, setPendingError] = useState("");
    const [query, setQuery] = useState("");
    const [stateFilter, setStateFilter] = useState("all");
    const [selected, setSelected] = useState("");
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState("");

    const refresh = () => setReload((prev) => !prev);

    useEffect(() => {
        let cancelled = false;
        async function fetchData() {
            try {
                const resUsers = await API.allUsers(authHeader());
                const resSites = await API.allSites(authHeader());
                if (cancelled) return;
                setUsers(resUsers.data || []);
                setAllSites([...(resSites.data || [])].sort());
                setLoadError("");
            } catch (error) {
                console.error("Error fetching users:", error);
                if (!cancelled) {
                    setUsers((prev) => prev ?? []);
                    setLoadError("사용자 목록을 불러오지 못했습니다.");
                }
            }
        }
        fetchData();
        return () => { cancelled = true; };
    }, [reload]);

    useEffect(() => {
        let cancelled = false;
        async function fetchPendingUsers() {
            try {
                const response = await API.pendingUsers(authHeader());
                if (cancelled) return;
                setPendingUsers(response.data?.pending_users || []);
                setPendingError("");
            } catch (error) {
                console.error("Error fetching pending users:", error);
                if (!cancelled) {
                    setPendingUsers((prev) => prev ?? []);
                    setPendingError("가입 대기 목록을 불러오지 못했습니다.");
                }
            }
        }
        fetchPendingUsers();
        return () => { cancelled = true; };
    }, [reload]);

    const counts = useMemo(() => {
        const list = users || [];
        const active = list.filter((u) => u.activate).length;
        return { all: list.length, active, inactive: list.length - active };
    }, [users]);

    const visibleUsers = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (users || [])
            .filter((u) => {
                if (stateFilter === "active" && !u.activate) return false;
                if (stateFilter === "inactive" && u.activate) return false;
                if (!q) return true;
                return [u.username, u.class, u.code].some((v) => String(v ?? "").toLowerCase().includes(q));
            })
            .sort((a, b) => Number(b.activate) - Number(a.activate)
                || String(a.username).localeCompare(String(b.username)));
    }, [users, query, stateFilter]);

    const selectedUser = (users || []).find((u) => u.username === selected) || null;

    useEffect(() => {
        if (selected && users && !users.some((u) => u.username === selected)) setSelected("");
    }, [users, selected]);

    const handleApproval = async (username) => {
        setBusy(username);
        try {
            await API.approveUser(authHeader(), username);
            setPendingUsers((prev) => (prev || []).filter((u) => u.username !== username));
            setMessage(`${username} 가입을 승인했습니다.`);
            refresh();
        } catch (error) {
            console.error(`Error approving user ${username}:`, error);
            setMessage(`${username} 승인에 실패했습니다.`);
        } finally {
            setBusy("");
        }
    };

    const handleDecline = async (username) => {
        if (!window.confirm(`${username}의 가입 요청을 거절하시겠습니까?`)) return;
        setBusy(username);
        try {
            await API.declineUser(authHeader(), username);
            setPendingUsers((prev) => (prev || []).filter((u) => u.username !== username));
            setMessage(`${username} 가입을 거절했습니다.`);
            refresh();
        } catch (error) {
            console.error(`Error declining user ${username}:`, error);
            setMessage(`${username} 거절에 실패했습니다.`);
        } finally {
            setBusy("");
        }
    };

    const pendingCount = pendingUsers ? pendingUsers.length : 0;

    return (
        <div className="v2">
            <V2Header title="사용자 설정" subtitle={users ? `사용자 ${counts.all}명` : ""}
                admin={admin} setAuth={setAuth} legacyPath="/setting">
                <div className="v2-toolbar">
                    <div className="v2-segment wide" role="tablist" aria-label="목록">
                        <button type="button" role="tab" aria-selected={tab === "users"}
                            className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
                            사용자
                        </button>
                        <button type="button" role="tab" aria-selected={tab === "pending"}
                            className={tab === "pending" ? "active" : ""} onClick={() => setTab("pending")}>
                            가입 대기 ({pendingCount})
                        </button>
                    </div>
                    {tab === "users" && (
                        <>
                            <input
                                className="v2-search"
                                type="search"
                                inputMode="search"
                                placeholder="아이디, 구분, 가입코드"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <div className="v2-chips">
                                {STATE_FILTERS.map((f) => (
                                    <button key={f.key} type="button" className={stateFilter === f.key ? "active" : ""}
                                        onClick={() => setStateFilter(f.key)}>
                                        {f.label} <span className="v2-chip-count">{counts[f.key]}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </V2Header>

            <main className="v2-content narrow">
                {message && (
                    <div className="v2-usr-toast" role="status">
                        <span>{message}</span>
                        <button type="button" onClick={() => setMessage("")} aria-label="알림 닫기">✕</button>
                    </div>
                )}

                {tab === "users" && (
                    <>
                        {loadError && <p className="v2-usr-error">{loadError}</p>}
                        {users === null && <p className="v2-empty">사용자 목록을 불러오는 중...</p>}
                        {users && users.length > 0 && visibleUsers.length === 0 && (
                            <p className="v2-empty">해당하는 사용자가 없습니다.</p>
                        )}
                        {users && users.length === 0 && !loadError && <p className="v2-empty">사용자가 없습니다.</p>}
                        <div className="v2-usr-list">
                            {visibleUsers.map((u) => (
                                <button key={u.username} type="button"
                                    className={`v2-usr-card ${u.activate ? "" : "inactive"}`}
                                    onClick={() => setSelected(u.username)}>
                                    <span className="v2-usr-card-top">
                                        <strong>{u.username}</strong>
                                        <span className={`v2-status ${u.activate ? "green" : ""}`}>
                                            {u.activate ? "활성" : "비활성"}
                                        </span>
                                    </span>
                                    <span className="v2-usr-card-meta">
                                        <span>구분 {u.class || "-"}</span>
                                        <span>가입코드 {u.code || "-"}</span>
                                        <span>현장 {(u.sites || []).length}곳</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {tab === "pending" && (
                    <>
                        {pendingError && <p className="v2-usr-error">{pendingError}</p>}
                        {pendingUsers === null && <p className="v2-empty">가입 대기 목록을 불러오는 중...</p>}
                        {pendingUsers && pendingUsers.length === 0 && !pendingError && (
                            <p className="v2-empty">대기 중인 사용자가 없습니다.</p>
                        )}
                        <div className="v2-usr-list">
                            {(pendingUsers || []).map((u) => (
                                <div key={u.username} className="v2-usr-card static">
                                    <span className="v2-usr-card-top">
                                        <strong>{u.username}</strong>
                                        <span className="v2-status orange">대기</span>
                                    </span>
                                    <span className="v2-usr-card-meta">
                                        <span>가입코드 {u.code || "-"}</span>
                                    </span>
                                    <div className="v2-actions">
                                        <button type="button" className="v2-btn v2-usr-primary"
                                            disabled={busy === u.username} onClick={() => handleApproval(u.username)}>
                                            승인
                                        </button>
                                        <button type="button" className="v2-btn"
                                            disabled={busy === u.username} onClick={() => handleDecline(u.username)}>
                                            거절
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            {selectedUser && (
                <UserSheet
                    key={selectedUser.username}
                    user={selectedUser}
                    allSites={allSites}
                    onClose={() => setSelected("")}
                    onChanged={refresh}
                />
            )}
        </div>
    );
}

function UserSheet({ user, allSites, onClose, onChanged }) {
    const [draft, setDraft] = useState(() => [...(user.sites || [])]);
    const [siteQuery, setSiteQuery] = useState("");
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const original = user.sites || [];
    const dirty = !sameSet(original, draft);

    const visibleSites = useMemo(() => {
        const q = siteQuery.trim().toLowerCase();
        if (!q) return allSites;
        return allSites.filter((s) => siteLabel(s).toLowerCase().includes(q) || s.toLowerCase().includes(q));
    }, [allSites, siteQuery]);

    // 목록에 없는 현장(삭제된 현장 등)도 기존 권한이 있으면 보여서 해제할 수 있게 한다
    const extraSites = original.filter((s) => !allSites.includes(s));

    const toggle = (site) => {
        setResult(null);
        setDraft((prev) => (prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]));
    };

    const selectVisible = () => {
        setResult(null);
        setDraft((prev) => [...prev, ...visibleSites.filter((s) => !prev.includes(s))]);
    };

    const clearVisible = () => {
        setResult(null);
        setDraft((prev) => prev.filter((s) => !visibleSites.includes(s)));
    };

    const revert = () => {
        setResult(null);
        setDraft([...original]);
    };

    const save = async () => {
        const added = draft.filter((s) => !original.includes(s));
        const removed = original.filter((s) => !draft.includes(s));
        setError("");
        if (!dirty) {
            setResult({ added: [], removed: [] });
            return;
        }
        setSaving(true);
        try {
            await API.userSiteViewAuthSet(authHeader(), user.username, { sites: draft });
            setResult({ added, removed });
            onChanged();
        } catch (err) {
            console.error(`Error modifying user's sites:`, err);
            setError("권한 저장에 실패했습니다. 다시 시도해 주세요.");
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (kind) => {
        const name = user.username;
        if (kind === "deactivate" && !window.confirm(`사용자 ${name}을 비활성화 하시겠습니까?`)) return;
        if (kind === "activate" && !window.confirm(`사용자 ${name}을 활성화 하시겠습니까?`)) return;
        if (kind === "delete" && !window.confirm(`사용자 ${name}을 삭제 하시겠습니까?`)) return;
        setBusy(true);
        setError("");
        try {
            if (kind === "deactivate") await API.deactivateUser(authHeader(), name);
            if (kind === "activate") await API.activateUser(authHeader(), name);
            if (kind === "delete") await API.deleteUser(authHeader(), name);
            onChanged();
            if (kind === "delete") onClose();
        } catch (err) {
            console.error(`Error (${kind}) user ${name}:`, err);
            setError("요청을 처리하지 못했습니다. 다시 시도해 주세요.");
        } finally {
            setBusy(false);
        }
    };

    const requestClose = () => {
        if (dirty && !result && !window.confirm("저장하지 않은 권한 변경이 있습니다. 닫으시겠습니까?")) return;
        onClose();
    };

    const renderSiteRow = (site, missing = false) => {
        const checked = draft.includes(site);
        return (
            <label key={site} className={`v2-usr-site ${checked ? "checked" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(site)} />
                <span className="v2-usr-site-name">{siteLabel(site)}</span>
                {missing && <span className="v2-muted v2-usr-site-note">목록에 없음</span>}
            </label>
        );
    };

    return (
        <div className="v2-sheet-overlay" onClick={requestClose}>
            <div className="v2-sheet v2-usr-sheet" onClick={(e) => e.stopPropagation()}
                role="dialog" aria-label={`${user.username} 설정`}>
                <div className="v2-sheet-handle" aria-hidden="true" />
                <div className="v2-usr-sheet-head">
                    <div className="v2-usr-sheet-title">
                        <strong>{user.username}</strong>
                        <span className="v2-muted">
                            구분 {user.class || "-"} · 가입코드 {user.code || "-"}
                        </span>
                    </div>
                    <span className={`v2-status ${user.activate ? "green" : ""}`}>
                        {user.activate ? "활성" : "비활성"}
                    </span>
                </div>

                <div className="v2-usr-sheet-body">
                    <section className="v2-usr-section">
                        <h2>계정 상태</h2>
                        {isManaged(user) ? (
                            <div className="v2-actions">
                                {user.activate ? (
                                    <button type="button" className="v2-btn" disabled={busy}
                                        onClick={() => runAction("deactivate")}>
                                        비활성화
                                    </button>
                                ) : (
                                    <>
                                        <button type="button" className="v2-btn v2-usr-primary" disabled={busy}
                                            onClick={() => runAction("activate")}>
                                            활성화
                                        </button>
                                        <button type="button" className="v2-btn v2-usr-danger" disabled={busy}
                                            onClick={() => runAction("delete")}>
                                            삭제
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="v2-muted v2-usr-note">이 계정은 상태를 변경할 수 없습니다.</p>
                        )}
                        {isManaged(user) && user.activate && (
                            <p className="v2-muted v2-usr-note">삭제하려면 먼저 비활성화하세요.</p>
                        )}
                    </section>

                    <section className="v2-usr-section">
                        <h2>
                            현장 보기 권한 <span className="v2-muted">{draft.length} / {allSites.length}곳</span>
                        </h2>
                        {user.activate ? (
                            <>
                                <input
                                    className="v2-search"
                                    type="search"
                                    inputMode="search"
                                    placeholder="현장 검색"
                                    value={siteQuery}
                                    onChange={(e) => setSiteQuery(e.target.value)}
                                />
                                <div className="v2-usr-bulk">
                                    <button type="button" className="v2-btn" onClick={selectVisible}>
                                        {siteQuery.trim() ? "검색 결과 선택" : "전체 선택"}
                                    </button>
                                    <button type="button" className="v2-btn" onClick={clearVisible}>
                                        {siteQuery.trim() ? "검색 결과 해제" : "전체 해제"}
                                    </button>
                                    <button type="button" className="v2-btn" onClick={revert} disabled={!dirty}>
                                        되돌리기
                                    </button>
                                </div>
                                <div className="v2-usr-sites">
                                    {visibleSites.length === 0 && <p className="v2-empty">해당하는 현장이 없습니다.</p>}
                                    {visibleSites.map((site) => renderSiteRow(site))}
                                    {!siteQuery.trim() && extraSites.map((site) => renderSiteRow(site, true))}
                                </div>
                            </>
                        ) : (
                            <p className="v2-muted v2-usr-note">
                                비활성 사용자는 활성화한 뒤 권한을 설정할 수 있습니다.
                                {original.length > 0 && ` (현재 ${original.length}곳)`}
                            </p>
                        )}
                    </section>
                </div>

                <div className="v2-usr-sheet-foot">
                    {error && <p className="v2-usr-error">{error}</p>}
                    {result && (
                        <div className="v2-usr-result" role="status">
                            <strong>
                                {result.added.length || result.removed.length ? "변경사항이 저장되었습니다." : "변경사항 없음"}
                            </strong>
                            {result.added.length > 0 && (
                                <span>추가: {result.added.map(siteLabel).join(", ")}</span>
                            )}
                            {result.removed.length > 0 && (
                                <span>삭제: {result.removed.map(siteLabel).join(", ")}</span>
                            )}
                        </div>
                    )}
                    <div className="v2-actions">
                        <button type="button" className="v2-btn" onClick={requestClose}>닫기</button>
                        {user.activate && (
                            <button type="button" className="v2-btn v2-usr-primary" disabled={saving} onClick={save}>
                                {saving ? "저장 중..." : "저장하기"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
