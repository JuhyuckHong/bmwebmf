import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Control.css";
import HistoryModal from "./HistoryModal";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";

const REFRESH_INTERVAL = 30000;
const TOAST_DURATION = 3000;

function formatTime(dt) {
    if (!dt) return null;
    const d = new Date(dt);
    const mo = String(d.getMonth() + 1);
    const day = String(d.getDate());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return { date: `${mo}/${day}`, time: `${hh}:${mm}` };
}

function formatRelative(dt) {
    if (!dt) return null;
    const diffMs = Date.now() - new Date(dt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return { val: `${Math.max(diffMin, 1)}m`, unit: "전" };
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return { val: `${diffHr}h`, unit: "전" };
    return { val: `${Math.floor(diffHr / 24)}d`, unit: "전" };
}

const w = (cond) => cond ? " ctrl-warn-bg" : "";

const COLUMNS = [
    { label: "#",         key: "id",           getValue: (m) => parseInt(m.id, 10) },
    { label: "현장",      key: "site_name",    getValue: (m) => m.site_name ?? "" },
    { label: "촬영", subLabel: "간격", key: "schedule",     getValue: (m) => m.time_start ?? "" },
    { label: "상태",        key: "status",       getValue: (m) => m.last_status ?? "" },
    { label: "온도",         key: "cpu_temp",     getValue: (m) => m.cpu_temp },
    { label: "메모리",      key: "mem_usage",    getValue: (m) => m.mem_usage },
    { label: "디스크",      key: "disk_usage",   getValue: (m) => m.disk_usage },
    { label: "Pi",          subLabel: "OS", key: "pi_model",     getValue: (m) => formatPiModel(m.pi_model) },
    { label: "기종",      key: "camera",       getValue: (m) => m.camera_model ? m.camera_model.replace(/^Nikon DSC\s*/i, "").replace(/\s*\(.*?\)/g, "").trim() : "" },
    { label: "EV",          subLabel: "ISO · F", key: "exposure_comp", getValue: (m) => m.exposure_comp },
    { label: "화질", subLabel: "해상도", key: "img_quality",  getValue: (m) => m.img_quality ?? "" },
    { label: "수집",        key: "last_time",    getValue: (m) => {
        const dt = m.last_success_time !== m.last_attempt_time
            ? m.last_success_time
            : (m.last_attempt_time ?? m.last_log_time);
        return dt ? new Date(dt).getTime() : null;
    }},
];

function Highlight({ text, query }) {
    if (!query || !text) return text ?? "—";
    const str = String(text);
    const idx = str.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return str;
    return (
        <>
            {str.slice(0, idx)}
            <mark className="ctrl-highlight">{str.slice(idx, idx + query.length)}</mark>
            {str.slice(idx + query.length)}
        </>
    );
}

function formatExpComp(val) {
    if (val == null) return "—";
    const n = parseFloat(val);
    if (isNaN(n)) return val;
    const thirds = Math.round(n * 3);
    if (thirds === 0) return "0";
    const sign = thirds < 0 ? "-" : "+";
    const abs = Math.abs(thirds);
    const whole = Math.floor(abs / 3);
    const rem = abs % 3;
    const frac = rem === 1 ? "1/3" : rem === 2 ? "2/3" : "";
    if (whole === 0) return `${sign}${frac}`;
    if (rem === 0)   return `${sign}${whole}`;
    return `${sign}${whole} ${frac}`;
}

function formatOsVersion(raw) {
    if (!raw) return "—";
    const s = raw.toLowerCase();
    if (s.includes("trixie"))   return "Tr";
    if (s.includes("bookworm")) return "Bk";
    if (s.includes("bullseye")) return "Bl";
    if (s.includes("buster"))   return "Bu";
    if (s.includes("stretch"))  return "St";
    if (s.includes("jessie"))   return "Je";
    return raw.trim();
}

function formatPiModel(raw) {
    if (!raw) return "—";
    const s = raw.trim();
    if (/Zero 2 W/i.test(s))              return "02W";
    if (/Zero W/i.test(s))                return "0W";
    if (/Zero/i.test(s))                  return "0";
    if (/Raspberry Pi 5/i.test(s))        return "5";
    if (/Raspberry Pi 4/i.test(s))        return "4B";
    if (/Raspberry Pi 3.*Plus/i.test(s))  return "3B+";
    if (/Raspberry Pi 3/i.test(s))        return "3B";
    if (/Raspberry Pi 2/i.test(s))        return "2B";
    if (/Model B Plus/i.test(s))          return "1B+";
    if (/Model B/i.test(s))               return "1B";
    if (/Model A Plus/i.test(s))          return "1A+";
    if (/Model A/i.test(s))               return "1A";
    return s;
}

function formatModuleVersion(version) {
    if (!version) return "-";
    const parts = String(version).split(".");
    if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
    if (parts.length >= 2) return parts.slice(1).join(".") || "-";
    return String(version);
}

function getModuleUpdateState(type, isLatest) {
    if (type !== "modern") return "-";
    if (isLatest === true) return "최신";
    if (isLatest === false) return "업데이트 필요";
    return "확인 불가";
}

function getUpdatePhaseLabel(status) {
    if (status === "in_progress") return "업데이트 진행 중";
    if (status === "completed") return "업데이트 완료";
    if (status === "failed") return "업데이트 실패";
    return null;
}

function CpuTempBadge({ temp }) {
    if (temp == null) return <span className="ctrl-sub muted">—</span>;
    const color = temp >= 50 ? "#ef4444" : temp >= 40 ? "#f59e0b" : "#0ea5e9";
    return <span className="ctrl-sub" style={{ color }}>{temp.toFixed(1)}°C</span>;
}

function UsagePie({ value, used, total, warnAt = 70, dangerAt = 90, alertAt = 90 }) {
    const isWarn = value == null || value >= alertAt;
    if (value == null) return <span className="ctrl-mono muted ctrl-warn-bg">—</span>;
    const color = value >= dangerAt ? "#ef4444" : value >= warnAt ? "#f59e0b" : "#22c55e";
    const r = 10;
    const circ = 2 * Math.PI * r;
    const filled = (value / 100) * circ;
    return (
        <div className={`usage-pie-wrap${isWarn ? " ctrl-warn-bg" : ""}`}>
            <svg width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r={r} fill="none" stroke="var(--border-color)" strokeWidth="4" />
                <circle
                    cx="14" cy="14" r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="4"
                    strokeDasharray={`${filled} ${circ - filled}`}
                    strokeLinecap="round"
                    transform="rotate(-90 14 14)"
                />
            </svg>
            <div className="usage-pie-info">
                <span className="usage-pie-label">{value}%</span>
                {used != null && total != null &&
                    <span className="usage-pie-gb">{used}/{total}</span>}
            </div>
        </div>
    );
}

function ScheduleBar({ timeStart, timeEnd, interval }) {
    const fmt = (t) => {
        if (!t || t.length < 4) return null;
        return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
    };
    const start = fmt(timeStart);
    const end = fmt(timeEnd);
    const intervalStr = interval != null ? `${String(interval).padStart(2, "0")}분` : null;

    if (!start && !end && !intervalStr) return <span className="ctrl-mono muted">—</span>;

    return (
        <span className="ctrl-col">
            <span className="ctrl-sub">{start && end ? `${start}~${end}` : (start || end || "—")}</span>
            {intervalStr && <span className="ctrl-sub muted">{intervalStr}</span>}
        </span>
    );
}

function StatusTypeBadge({ status, type, moduleVersion, onClick, canClick, title, updateState }) {
    const cls = (status === "SUCCESS" || status === "PARTIAL") ? "success" : status === "ERROR" ? "error" : "unknown";
    const label = type === "modern" ? formatModuleVersion(moduleVersion) : "L";
    const updateCls = updateState === "in_progress"
        ? " updating"
        : updateState === "failed"
            ? " update-failed"
            : updateState === "completed"
                ? " update-completed"
                : "";
    return (
        <button
            type="button"
            className={`status-type-badge ${cls}${canClick ? " clickable" : ""}${updateCls}`}
            title={title}
            onClick={onClick}
            disabled={!canClick}
        >
            {label}
        </button>
    );
}

export default function ControlPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const [filter, setFilter] = useState("");
    const [selectedModule, setSelectedModule] = useState(null);
    const [sort, setSort] = useState({ key: null, dir: null });
    const [updateDialog, setUpdateDialog] = useState(null);
    const [updateStatuses, setUpdateStatuses] = useState({});
    const [toast, setToast] = useState(null);
    const searchRef = useRef(null);
    const eventSourcesRef = useRef({});
    const toastTimerRef = useRef(null);
    const hasRestoredRef = useRef(false);

    const handleSort = useCallback((key) => {
        setSort(prev => {
            if (prev.key !== key) return { key, dir: "asc" };
            if (prev.dir === "asc") return { key, dir: "desc" };
            return { key: null, dir: null };
        });
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.getLatest(headers);
            setData(res.data);
            setLastFetched(new Date());
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, REFRESH_INTERVAL);
        return () => clearInterval(id);
    }, [fetchData]);

    const closeUpdateStream = useCallback((moduleId) => {
        const current = eventSourcesRef.current[moduleId];
        if (current) {
            current.close();
            delete eventSourcesRef.current[moduleId];
        }
    }, []);

    const showToast = useCallback((message, tone = "info") => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, TOAST_DURATION);
    }, []);

    useEffect(() => () => {
        Object.values(eventSourcesRef.current).forEach((source) => source.close());
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
    }, []);

    const applyUpdateEvent = useCallback((payload) => {
        const moduleId = payload?.module_id;
        if (!moduleId) return;

        const nextStatus = payload.status ?? "in_progress";
        const nextMessage = payload.message ?? null;
        const jobId = payload.job_id ?? null;

        setUpdateStatuses((prev) => ({
            ...prev,
            [moduleId]: {
                status: nextStatus,
                message: nextMessage,
                jobId,
                previousVersion: payload.previous_version ?? prev[moduleId]?.previousVersion ?? null,
                currentVersion: payload.current_version ?? prev[moduleId]?.currentVersion ?? null,
            },
        }));

        setUpdateDialog((prev) => (
            prev?.module?.id === moduleId
                ? { ...prev, phase: nextStatus, message: nextMessage, jobId }
                : prev
        ));

        if (nextStatus === "completed") {
            closeUpdateStream(moduleId);
            showToast(nextMessage ?? "업데이트가 완료되었습니다.", "success");
            fetchData();
            return;
        }

        if (nextStatus === "failed") {
            closeUpdateStream(moduleId);
            showToast(nextMessage ?? "업데이트에 실패했습니다.", "error");
        }
    }, [closeUpdateStream, fetchData, showToast]);

    const openUpdateStream = useCallback((moduleId, jobId) => {
        if (!moduleId || !jobId) return;

        const current = eventSourcesRef.current[moduleId];
        if (current?.jobId === jobId) return;

        closeUpdateStream(moduleId);

        const source = new EventSource(API.getModuleUpdateEventsUrl(moduleId, jobId));
        source.jobId = jobId;

        const handleEvent = (event) => {
            try {
                const payload = JSON.parse(event.data);
                applyUpdateEvent(payload);
            } catch (err) {
                console.error("Failed to parse update event", err);
            }
        };

        source.addEventListener("started", handleEvent);
        source.addEventListener("progress", handleEvent);
        source.addEventListener("completed", handleEvent);
        source.addEventListener("failed", handleEvent);
        source.onerror = () => {
            source.close();
            delete eventSourcesRef.current[moduleId];
        };

        eventSourcesRef.current[moduleId] = source;
    }, [applyUpdateEvent, closeUpdateStream]);

    const restoreActiveUpdates = useCallback(async (modulesToRestore) => {
        const modernModules = modulesToRestore.filter((module) => module.type === "modern");
        if (modernModules.length === 0) return;

        const headers = { Authorization: Cookies.get("BM") };
        const results = await Promise.allSettled(
            modernModules.map((module) => API.getActiveModuleUpdate(headers, module.id))
        );

        results.forEach((result, index) => {
            if (result.status !== "fulfilled") return;

            const module = modernModules[index];
            const payload = result.value.data;
            if (payload?.status !== "in_progress" || !payload.job_id) return;

            setUpdateStatuses((prev) => ({
                ...prev,
                [module.id]: {
                    status: "in_progress",
                    message: payload.message ?? "Update in progress",
                    jobId: payload.job_id,
                },
            }));
            openUpdateStream(module.id, payload.job_id);
        });
    }, [openUpdateStream]);

    useEffect(() => {
        if (hasRestoredRef.current || !data?.modules?.length) return;
        hasRestoredRef.current = true;
        restoreActiveUpdates(data.modules);
    }, [data, restoreActiveUpdates]);

    const openUpdateDialog = useCallback((module) => {
        const current = updateStatuses[module.id];
        const phase = module.is_latest === true ? "latest" : (current?.status === "in_progress" ? "in_progress" : "confirm");

        setUpdateDialog({
            module,
            phase,
            message: current?.message ?? null,
            jobId: current?.jobId ?? null,
        });
    }, [updateStatuses]);

    const startUpdate = useCallback(async () => {
        if (!updateDialog?.module) return;
        const moduleId = updateDialog.module.id;

        setUpdateDialog((prev) => prev ? { ...prev, phase: "submitting", message: null } : prev);

        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.startModuleUpdate(headers, moduleId);
            const nextStatus = res.data?.status ?? "in_progress";
            const nextMessage = res.data?.message ?? "Update started";
            const jobId = res.data?.job_id ?? null;

            setUpdateStatuses((prev) => ({
                ...prev,
                [moduleId]: { status: nextStatus, message: nextMessage, jobId },
            }));
            setUpdateDialog((prev) => (
                prev ? { ...prev, phase: nextStatus, message: nextMessage, jobId } : prev
            ));

            if (nextStatus === "in_progress" && jobId) {
                openUpdateStream(moduleId, jobId);
                showToast(nextMessage, "info");
            }
        } catch (err) {
            const message = err.message ?? "업데이트 요청에 실패했습니다.";
            setUpdateStatuses((prev) => ({
                ...prev,
                [moduleId]: { status: "failed", message },
            }));
            setUpdateDialog((prev) => (
                prev ? { ...prev, phase: "failed", message } : prev
            ));
            showToast(message, "error");
        }
    }, [openUpdateStream, showToast, updateDialog]);

    const closeUpdateDialog = useCallback(() => {
        setUpdateDialog(null);
    }, []);

    useKeyboardNavigation({
        '/': () => {
            searchRef.current?.focus();
            searchRef.current?.select();
        },
        'r': () => fetchData(),
        'R': () => fetchData(),
    }, { enabled: !selectedModule });

    const modules = data?.modules ?? [];
    const q = filter.trim().toLowerCase();
    const filtered = q
        ? modules.filter((m) => [
              m.id,
              m.site_name,
              m.ip,
              m.last_status,
              m.pi_model ? formatPiModel(m.pi_model) : null,
              m.os_version,
              m.camera_model ? m.camera_model.replace(/^Nikon DSC\s*/i, "").replace(/\s*\(.*?\)/g, "").trim() : null,
              m.iso != null ? String(m.iso) : null,
              m.exposure_comp != null ? formatExpComp(m.exposure_comp) : null,
              m.focus_mode,
              m.img_quality,
              m.img_size,
          ].some((v) => v && String(v).toLowerCase().includes(q)))
        : modules;

    const sorted = useMemo(() => {
        if (!sort.key || !sort.dir) return filtered;
        const col = COLUMNS.find(c => c.key === sort.key);
        if (!col) return filtered;
        return [...filtered].sort((a, b) => {
            const av = col.getValue(a);
            const bv = col.getValue(b);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = typeof av === "string" ? av.localeCompare(bv, "ko") : av - bv;
            return sort.dir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sort]);

    const successCount = modules.filter((m) => m.last_status === "SUCCESS").length;
    const errorCount = modules.filter((m) => m.last_status === "ERROR").length;
    const noDataCount = modules.filter((m) => !m.last_status).length;

    return (
        <>
        <div className="control-page">
            <div className="control-toolbar">
                <h2 className="ctrl-toolbar-title">모듈 정보</h2>
                <div className="control-search-wrap">
                    <input
                        ref={searchRef}
                        id="control-search"
                        name="control-search"
                        className="control-search"
                        type="text"
                        placeholder="검색..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                {!loading && data && (
                    <div className="ctrl-stat-pills">
                        <span className="ctrl-stat-pill">{data.count} 전체</span>
                        <span className="ctrl-stat-pill success">{successCount} 정상</span>
                        <span className="ctrl-stat-pill error">{errorCount} 연결실패</span>
                        {noDataCount > 0 && <span className="ctrl-stat-pill">{noDataCount} 없음</span>}
                    </div>
                )}
                {q && <span className="control-filter-result">{filtered.length}개</span>}
                <div className="ctrl-toolbar-spacer" />
                <p className="ctrl-refresh-info">
                    <span className="live-dot" />
                    {lastFetched ? lastFetched.toLocaleTimeString("ko-KR") : "..."}
                </p>
                <button className="admin-btn" onClick={fetchData}>새로고침</button>
            </div>

            <div className="control-card">
                {error && <div className="logs-error">연결실패: {error}</div>}
                {loading && (
                    <div className="control-loading">데이터 불러오는 중...</div>
                )}

                {!loading && !error && (
                    <div className="control-table-outer">
                    <div className="control-table-wrap">
                        <div className="control-table-header">
                            {COLUMNS.map(col => (
                                <span
                                    key={col.key}
                                    className={`ctrl-th-sortable${sort.key === col.key ? " ctrl-th-active" : ""}`}
                                    onClick={() => handleSort(col.key)}
                                >
                                    <span className="ctrl-th-label">
                                        <span className={col.subLabel ? "ctrl-th-sublabel" : ""}>{col.label}</span>
                                        {col.subLabel && <span className="ctrl-th-sublabel">{col.subLabel}</span>}
                                    </span>
                                    <span className="ctrl-sort-icon">
                                        {sort.key === col.key
                                            ? sort.dir === "asc" ? "↑" : "↓"
                                            : "↕"}
                                    </span>
                                </span>
                            ))}
                        </div>
                        <ul className="control-table-list">
                            {sorted.length === 0 ? (
                                <li className="control-empty">
                                    검색 결과가 없습니다.
                                </li>
                            ) : (
                                sorted.map((m) => {
                                    const updateStatus = updateStatuses[m.id]?.status ?? "idle";
                                    const updateMessage = updateStatuses[m.id]?.message;
                                    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
                                    const msSinceSuccess = m.last_status === "ERROR"
                                        ? (m.last_success_time
                                            ? Date.now() - new Date(m.last_success_time).getTime()
                                            : ONE_WEEK)
                                        : 0;
                                    const fadeRatio = Math.min(msSinceSuccess / ONE_WEEK, 1);
                                    const isWithdrawn = fadeRatio >= 1;
                                    return (
                                    <li
                                        key={m.id}
                                        className={`control-row ${
                                            isWithdrawn
                                                ? "row-withdrawn"
                                                : m.last_status === "ERROR"
                                                  ? "row-error row-fading"
                                                  : !m.last_status
                                                    ? "row-unknown"
                                                    : ""
                                        }`}
                                        onClick={() => setSelectedModule(m)}
                                        style={{ cursor: "pointer", ...(fadeRatio > 0 && { "--row-fade": fadeRatio }) }}>
                                        <span className="ctrl-id">{parseInt(m.id, 10)}</span>
                                        <span className="ctrl-name"><Highlight text={m.site_name} query={q} /></span>
                                        <span className="ctrl-cell ctrl-schedule">
                                            <ScheduleBar timeStart={m.time_start} timeEnd={m.time_end} interval={m.time_interval} />
                                        </span>
                                        <span className="ctrl-cell">
                                            <StatusTypeBadge
                                                status={m.last_status}
                                                type={m.type}
                                                moduleVersion={m.module_version}
                                                canClick={m.type === "modern"}
                                                updateState={updateStatus}
                                                title={`${getModuleUpdateState(m.type, m.is_latest)} · ${getUpdatePhaseLabel(updateStatus) ?? "대기"} · ${m.type} · ${m.last_status ?? "데이터 없음"} · v${m.module_version ?? "-"}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (m.type !== "modern") return;
                                                    openUpdateDialog(m);
                                                }}
                                            />
                                        </span>
                                        <span className={`ctrl-cell${w(m.cpu_temp == null || m.cpu_temp >= 50)}`}><CpuTempBadge temp={m.cpu_temp} /></span>
                                        <UsagePie value={m.mem_usage} alertAt={90} />
                                        <UsagePie value={m.disk_usage} used={m.disk_used_gb} total={m.disk_total_gb} warnAt={60} dangerAt={75} alertAt={75} />
                                        <span className={`ctrl-col${w(m.pi_model == null)}`}>
                                            <span className="ctrl-sub"><Highlight text={formatPiModel(m.pi_model)} query={q} /></span>
                                            <span className="ctrl-sub muted"><Highlight text={formatOsVersion(m.os_version)} query={q} /></span>
                                        </span>
                                        <span className={`ctrl-sub${w(!m.camera_model || /^USB PTP Class Camera$/i.test(m.camera_model.trim()))}`}><Highlight text={(m.camera_model && !/^USB PTP Class Camera$/i.test(m.camera_model.trim())) ? m.camera_model.replace(/^Nikon DSC\s*/i, "").replace(/\s*\(.*?\)/g, "").trim() : null} query={q} /></span>
                                        <span className={`ctrl-col${w(m.exposure_comp == null && m.iso == null && m.focus_mode == null)}`}>
                                            <span className="ctrl-sub"><Highlight text={formatExpComp(m.exposure_comp)} query={q} /></span>
                                            <span className="ctrl-sub muted">
                                                <Highlight text={m.iso != null ? String(m.iso) : null} query={q} />
                                                {m.iso != null && m.focus_mode ? " · " : null}
                                                <Highlight text={m.focus_mode ? m.focus_mode.replace(/\s*\(.*\)/, "") : null} query={q} />
                                            </span>
                                        </span>
                                        <span className={`ctrl-mono ctrl-col${w(m.img_quality == null)}`}>
                                            <span className="ctrl-mono ctrl-sub"><Highlight text={m.img_quality} query={q} /></span>
                                            {m.img_size ? <span className="ctrl-sub"><Highlight text={m.img_size} query={q} /></span> : null}
                                        </span>
                                        <span className="ctrl-col ctrl-time-col">
                                            {(() => {
                                                const dt = m.last_success_time !== m.last_attempt_time
                                                    ? m.last_success_time
                                                    : (m.last_attempt_time ?? m.last_log_time);
                                                const rel = formatRelative(dt);
                                                return rel
                                                    ? <span className="ctrl-rel-time">
                                                        <span className="ctrl-rel-val">{rel.val}</span>
                                                        <span className="ctrl-rel-unit">{rel.unit}</span>
                                                      </span>
                                                    : <span className="ctrl-sub">—</span>;
                                            })()}
                                        </span>
                                    </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>
                    </div>
                )}
            </div>
        </div>

        {selectedModule && (
            <HistoryModal
                module={selectedModule}
                onClose={() => setSelectedModule(null)}
            />
        )}
        {updateDialog && (
            <div className="control-modal-overlay" onClick={closeUpdateDialog}>
                <div className="control-confirm-modal" onClick={(e) => e.stopPropagation()}>
                    <h3 className="control-confirm-title">모듈 업데이트</h3>
                    <p className="control-confirm-text">
                        {updateDialog.phase === "latest" ? (
                            <>
                                <strong>{updateDialog.module.site_name}</strong>
                                {" "}
                                ({parseInt(updateDialog.module.id, 10)}) 모듈은 최신입니다.
                            </>
                        ) : (
                            <>
                                <strong>{updateDialog.module.site_name}</strong>
                                {" "}
                                ({parseInt(updateDialog.module.id, 10)}) 모듈을 업데이트하시겠습니까?
                            </>
                        )}
                    </p>
                    <p className="control-confirm-subtext">
                        현재 버전: {updateDialog.module.module_version || "-"}
                    </p>
                    <p className="control-confirm-subtext">
                        최신 버전: {updateDialog.module.latest_module_version || "-"} · {getModuleUpdateState(updateDialog.module.type, updateDialog.module.is_latest)}
                    </p>
                    {updateStatuses[updateDialog.module.id]?.status === "in_progress" && (
                        <p className="control-confirm-subtext">
                            작업 ID: {updateStatuses[updateDialog.module.id]?.jobId || "-"} · 업데이트 진행 중
                        </p>
                    )}
                    {updateDialog.message && (
                        <p className="control-confirm-status">{updateDialog.message}</p>
                    )}
                    <div className="control-confirm-actions">
                        <button className="hist-close-btn" onClick={closeUpdateDialog}>
                            {updateDialog.phase === "confirm" ? "취소" : "닫기"}
                        </button>
                        {updateDialog.phase !== "latest" && (
                            <button
                                className="admin-btn"
                                onClick={startUpdate}
                                disabled={
                                    !["confirm", "failed"].includes(updateDialog.phase) ||
                                    !(updateDialog.module.type === "modern" && updateDialog.module.is_latest !== true) ||
                                    updateStatuses[updateDialog.module.id]?.status === "in_progress"
                                }
                            >
                                {updateDialog.phase === "submitting"
                                    ? "요청 중..."
                                    : updateStatuses[updateDialog.module.id]?.status === "in_progress"
                                        ? "진행 중"
                                        : "확인"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )}
        {toast && (
            <div className="control-toast-wrap">
                <div className={`control-toast ${toast.tone}`}>
                    <span>{toast.message}</span>
                    <button type="button" className="control-toast-close" onClick={() => setToast(null)}>
                        ✕
                    </button>
                </div>
            </div>
        )}
        </>
    );
}
