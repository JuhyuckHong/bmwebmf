import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../../API";
import V2Header from "./V2Header";
import HistoryModal from "../HistoryModal";
import ScheduleDialog from "../ScheduleDialog";
import { SCHEDULE_STATUS_LABELS } from "../scheduleUtils";
import {
    COLUMNS,
    formatTime,
    formatExpComp,
    formatOsVersion,
    formatPiModel,
    formatModuleVersion,
    getModuleUpdateState,
    getUpdatePhaseLabel,
} from "../ControlPage";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import { useKeyboardContext } from "../../context/KeyboardNavigationContext";
import { readStored, writeStored } from "./v2Utils";
import "../../CSS/Control.css";
import "../../CSS/Changes.css";
import "./v2.css";
import "./V2Control.css";

const REFRESH_INTERVAL = 30000;
const TOAST_DURATION = 3000;
const SORT_KEY = "bm-v2-ctrl-sort";
const DAY_MS = 24 * 60 * 60 * 1000;
const THREE_DAYS = 3 * DAY_MS;
const SEVEN_DAYS = 7 * DAY_MS;

const FILTERS = [
    { key: "all", label: "전체" },
    { key: "ok", label: "정상" },
    { key: "error", label: "연결실패" },
    { key: "none", label: "없음" },
];

// ControlPage 표 머리글과 같은 정렬 기준 (값 계산은 COLUMNS를 그대로 쓴다)
const SORT_LABELS = {
    id: "모듈 번호",
    site_name: "현장 이름",
    schedule: "촬영 시작",
    cpu_temp: "CPU 온도",
    disk_usage: "디스크",
    pi_model: "Pi 모델",
    camera: "카메라 기종",
    exposure_comp: "노출보정",
    img_quality: "화질",
    last_time: "최근 수집",
};

const cameraLabel = (raw) => (raw ? raw.replace(/^Nikon DSC\s*/i, "").replace(/\s*\(.*?\)/g, "").trim() : null);
const isUnknownCamera = (raw) => !raw || /^USB PTP Class Camera$/i.test(raw.trim());
const fmtHHMM = (t) => (t && t.length >= 4 ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : null);

// ControlPage "수집·상태" 열과 같은 기준 시각
const lastCollectTime = (m) => (m.last_success_time !== m.last_attempt_time
    ? m.last_success_time
    : (m.last_attempt_time ?? m.last_log_time));

const formatAgoDate = (dt, now = Date.now()) => {
    if (!dt) return "기록 없음";
    const minutes = Math.floor((now - new Date(dt).getTime()) / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}시간 전`;
    return `${Math.floor(minutes / (24 * 60))}일 전`;
};

const formatDateTime = (dt) => {
    const t = formatTime(dt);
    return t ? `${t.date} ${t.time}` : "—";
};

const parseSort = (raw) => {
    const [key, dir] = String(raw || "").split(":");
    return SORT_LABELS[key] && (dir === "asc" || dir === "desc") ? { key, dir } : { key: null, dir: null };
};

function connectionMeta(status) {
    if (status === "SUCCESS") return { label: "정상", tone: "green" };
    if (status === "PARTIAL") return { label: "부분 정상", tone: "green" };
    if (status === "ERROR") return { label: "연결실패", tone: "red" };
    if (!status) return { label: "데이터 없음", tone: "gray" };
    return { label: status, tone: "gray" };
}

// 최근 성공 후 3일부터 흐려지기 시작해 7일이면 철수 추정 (ControlPage 행 흐림과 같은 기준)
function freshnessOf(m) {
    const hasData = m.last_status != null || m.last_success_time != null;
    const msSinceSuccess = m.last_success_time
        ? Date.now() - new Date(m.last_success_time).getTime()
        : SEVEN_DAYS;
    const fadeRatio = Math.min(Math.max((msSinceSuccess - THREE_DAYS) / (SEVEN_DAYS - THREE_DAYS), 0), 1);
    const days = Math.floor(msSinceSuccess / DAY_MS);
    if (!hasData) return { state: "unknown", label: null };
    if (fadeRatio >= 1) return { state: "withdrawn", label: "철수 추정" };
    if (fadeRatio > 0.05) return { state: "fading", label: `${days}일 미수신` };
    return { state: "fresh", label: null };
}

const tempTone = (t) => (t == null || t >= 55 ? "red" : t >= 40 ? "orange" : "");
const diskTone = (d) => (d == null || d >= 75 ? "red" : d >= 60 ? "orange" : "green");

function Highlight({ text, query }) {
    if (!query || !text) return text ?? "—";
    const str = String(text);
    const idx = str.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return str;
    return (
        <>
            {str.slice(0, idx)}
            <mark className="v2-ctrl-mark">{str.slice(idx, idx + query.length)}</mark>
            {str.slice(idx + query.length)}
        </>
    );
}

function ScheduleText({ module }) {
    const start = fmtHHMM(module.time_start);
    const end = fmtHHMM(module.time_end);
    const range = start && end ? `${start}~${end}` : (start || end);
    const interval = module.time_interval != null ? `${module.time_interval}분` : null;
    const change = module.schedule_change;
    return (
        <>
            {range || interval ? [range, interval].filter(Boolean).join(" · ") : "—"}
            {change && change.status !== "applied" && (
                <span className={`v2-ctrl-sched-badge ${change.status}`} title={change.message ?? ""}>
                    {SCHEDULE_STATUS_LABELS[change.status] ?? change.status}
                </span>
            )}
        </>
    );
}

function UpdateState({ module, status }) {
    if (status === "in_progress") {
        return <span className="v2-ctrl-upd orange"><span className="v2-ctrl-dot-spin" aria-hidden="true" />업데이트 중</span>;
    }
    if (status === "failed") return <span className="v2-ctrl-upd red">업데이트 실패</span>;
    if (status === "completed") return <span className="v2-ctrl-upd green">업데이트 완료</span>;
    if (module.type === "modern" && module.is_latest === false) return <span className="v2-ctrl-upd orange">업데이트 필요</span>;
    return null;
}

// 열려 있는 동안 전역 Esc 스택에 올려 Esc로 맨 위 창부터 닫히게 한다 (ControlPage와 같은 방식)
function useModalLayer(modalId, open, close) {
    const { pushModal } = useKeyboardContext();
    const closeRef = useRef(close);
    closeRef.current = close;
    useEffect(() => {
        if (!open) return;
        pushModal(modalId);
        const handler = (e) => {
            if (e.detail?.modalId === modalId) closeRef.current();
        };
        window.addEventListener("closeModal", handler);
        return () => {
            window.removeEventListener("closeModal", handler);
            window.dispatchEvent(new CustomEvent("modalClosed", { detail: { modalId } }));
        };
    }, [modalId, open, pushModal]);
}

export default function V2Control({ admin, setAuth }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState(() => parseSort(readStored(SORT_KEY, "")));
    const [detailId, setDetailId] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [updateDialog, setUpdateDialog] = useState(null);
    const [updateStatuses, setUpdateStatuses] = useState({});
    const [toast, setToast] = useState(null);
    const searchRef = useRef(null);
    const eventSourcesRef = useRef({});
    const toastTimerRef = useRef(null);
    const hasRestoredRef = useRef(false);

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

    const changeSort = (next) => {
        setSort(next);
        writeStored(SORT_KEY, next.key ? `${next.key}:${next.dir}` : "");
    };

    // ── 모듈 업데이트 (ControlPage와 같은 흐름: 요청 → SSE 진행 → 완료/실패 토스트) ──
    const closeUpdateStream = useCallback((moduleId) => {
        const current = eventSourcesRef.current[moduleId];
        if (current) {
            current.close();
            delete eventSourcesRef.current[moduleId];
        }
    }, []);

    const showToast = useCallback((message, tone = "info") => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, tone });
        toastTimerRef.current = setTimeout(() => {
            setToast(null);
            toastTimerRef.current = null;
        }, TOAST_DURATION);
    }, []);

    useEffect(() => () => {
        Object.values(eventSourcesRef.current).forEach((source) => source.close());
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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
        if (eventSourcesRef.current[moduleId]?.jobId === jobId) return;

        closeUpdateStream(moduleId);

        const source = new EventSource(API.getModuleUpdateEventsUrl(moduleId, jobId));
        source.jobId = jobId;

        const handleEvent = (event) => {
            try {
                applyUpdateEvent(JSON.parse(event.data));
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

    // 페이지를 다시 열었을 때 진행 중이던 업데이트를 이어서 본다
    const restoreActiveUpdates = useCallback(async (modulesToRestore) => {
        const modernModules = modulesToRestore.filter((module) => module.type === "modern");
        if (modernModules.length === 0) return;

        const headers = { Authorization: Cookies.get("BM") };
        const results = await Promise.allSettled(
            modernModules.map((module) => API.getActiveModuleUpdate(headers, module.id)),
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

        setUpdateDialog((prev) => (prev ? { ...prev, phase: "submitting", message: null } : prev));

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
            setUpdateDialog((prev) => (prev ? { ...prev, phase: "failed", message } : prev));
            showToast(message, "error");
        }
    }, [openUpdateStream, showToast, updateDialog]);

    // ── 목록 ──
    const modules = useMemo(() => data?.modules ?? [], [data]);
    const q = query.trim().toLowerCase();

    const counts = useMemo(() => ({
        all: data?.count ?? modules.length,
        ok: modules.filter((m) => m.last_status === "SUCCESS").length,
        error: modules.filter((m) => m.last_status === "ERROR").length,
        none: modules.filter((m) => !m.last_status).length,
    }), [data, modules]);

    const visible = useMemo(() => {
        const list = modules.filter((m) => {
            if (filter === "ok" && m.last_status !== "SUCCESS") return false;
            if (filter === "error" && m.last_status !== "ERROR") return false;
            if (filter === "none" && m.last_status) return false;
            if (!q) return true;
            return [
                m.id,
                m.site_name,
                m.ip,
                m.last_status,
                m.pi_model ? formatPiModel(m.pi_model) : null,
                m.os_version,
                cameraLabel(m.camera_model),
                m.iso != null ? String(m.iso) : null,
                m.exposure_comp != null ? formatExpComp(m.exposure_comp) : null,
                m.focus_mode,
                m.img_quality,
                m.img_size,
            ].some((v) => v && String(v).toLowerCase().includes(q));
        });
        const col = sort.key && COLUMNS.find((c) => c.key === sort.key);
        if (!col) return list;
        return [...list].sort((a, b) => {
            const av = col.getValue(a);
            const bv = col.getValue(b);
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = typeof av === "string" ? av.localeCompare(bv, "ko") : av - bv;
            return sort.dir === "asc" ? cmp : -cmp;
        });
    }, [modules, filter, q, sort]);

    // 상세 시트는 id로 들고 있어 30초 갱신 값이 바로 반영된다
    const detail = detailId != null ? modules.find((m) => m.id === detailId) ?? null : null;
    const closeDetail = useCallback(() => {
        setDetailId(null);
        setHistoryOpen(false);
        setScheduleOpen(false);
    }, []);

    useModalLayer("v2-ctrl-detail", !!detail, closeDetail);
    useModalLayer("history-modal", !!detail && historyOpen, () => setHistoryOpen(false));
    useModalLayer("v2-ctrl-schedule", !!detail && scheduleOpen, () => setScheduleOpen(false));
    useModalLayer("v2-ctrl-update", !!updateDialog, () => setUpdateDialog(null));

    useKeyboardNavigation({
        "/": () => {
            searchRef.current?.focus();
            searchRef.current?.select();
        },
        r: () => fetchData(),
        R: () => fetchData(),
    }, { enabled: !detail && !updateDialog });

    const detailUpdate = detail ? updateStatuses[detail.id] : null;
    const dialogStatus = updateDialog ? updateStatuses[updateDialog.module.id]?.status : null;

    return (
        <div className="v2">
            <V2Header
                title="모듈 정보"
                subtitle={data ? `${counts.all}대` : null}
                admin={admin}
                setAuth={setAuth}
                legacyPath="/modules"
            >
                <div className="v2-toolbar">
                    <input
                        ref={searchRef}
                        className="v2-search"
                        type="search"
                        inputMode="search"
                        placeholder="번호·현장·IP·카메라·설정 검색"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="v2-chips">
                        {FILTERS.map((f) => (
                            <button key={f.key} type="button" className={filter === f.key ? "active" : ""}
                                onClick={() => setFilter(f.key)}>
                                {f.label} <span className="v2-chip-count">{data ? counts[f.key] : "-"}</span>
                            </button>
                        ))}
                    </div>
                    <div className="v2-ctrl-sortbar">
                        <select
                            className="v2-ctrl-sort"
                            aria-label="정렬 기준"
                            value={sort.key ?? ""}
                            onChange={(e) => changeSort(e.target.value
                                ? { key: e.target.value, dir: sort.dir ?? "asc" }
                                : { key: null, dir: null })}
                        >
                            <option value="">기본 순서</option>
                            {COLUMNS.map((c) => (
                                <option key={c.key} value={c.key}>{SORT_LABELS[c.key] ?? c.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="v2-btn v2-ctrl-dir"
                            disabled={!sort.key}
                            onClick={() => changeSort({ key: sort.key, dir: sort.dir === "asc" ? "desc" : "asc" })}
                            aria-label="정렬 방향 바꾸기"
                        >
                            {sort.dir === "desc" ? "내림차순 ↓" : "오름차순 ↑"}
                        </button>
                    </div>
                </div>
            </V2Header>

            <main className="v2-content">
                <div className="v2-ctrl-statusbar">
                    <span className="v2-ctrl-live" aria-hidden="true" />
                    <span>
                        {lastFetched ? `${lastFetched.toLocaleTimeString("ko-KR")} 갱신` : "불러오는 중"}
                        {(q || filter !== "all") && data ? ` · ${visible.length}개 표시` : ""}
                    </span>
                    <button type="button" className="v2-btn v2-ctrl-refresh" onClick={fetchData}>새로고침</button>
                </div>

                {error && <p className="v2-ctrl-error">연결실패: {error}</p>}
                {loading && <p className="v2-empty">데이터 불러오는 중...</p>}
                {!loading && data && visible.length === 0 && <p className="v2-empty">검색 결과가 없습니다.</p>}

                <div className="v2-ctrl-grid">
                    {visible.map((m) => {
                        const conn = connectionMeta(m.last_status);
                        const fresh = freshnessOf(m);
                        const updStatus = updateStatuses[m.id]?.status;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                className={`v2-ctrl-card ${fresh.state}${m.last_status === "ERROR" ? " error" : ""}`}
                                onClick={() => setDetailId(m.id)}
                            >
                                <span className="v2-ctrl-card-head">
                                    <span className="v2-ctrl-id">{parseInt(m.id, 10)}</span>
                                    <strong className="v2-ctrl-site"><Highlight text={m.site_name} query={q} /></strong>
                                    <span className={`v2-status ${conn.tone}`}>{conn.label}</span>
                                </span>
                                <span className="v2-ctrl-tags">
                                    {fresh.label && (
                                        <span className={`v2-ctrl-tag ${fresh.state === "withdrawn" ? "gray" : "orange"}`}>
                                            {fresh.label}
                                        </span>
                                    )}
                                    <span className="v2-ctrl-tag">
                                        {m.type !== "modern" ? "레거시" : m.module_version ? `v${formatModuleVersion(m.module_version)}` : "버전 없음"}
                                    </span>
                                    <UpdateState module={m} status={updStatus} />
                                </span>
                                <span className="v2-ctrl-stats">
                                    <span className="v2-ctrl-stat">
                                        <span className="v2-ctrl-k">최근 수집</span>
                                        <span className="v2-ctrl-v">{formatAgoDate(lastCollectTime(m))}</span>
                                    </span>
                                    <span className="v2-ctrl-stat">
                                        <span className="v2-ctrl-k">촬영</span>
                                        <span className="v2-ctrl-v"><ScheduleText module={m} /></span>
                                    </span>
                                    <span className="v2-ctrl-stat">
                                        <span className="v2-ctrl-k">CPU 온도</span>
                                        <span className={`v2-ctrl-v ${tempTone(m.cpu_temp)}`}>
                                            {m.cpu_temp != null ? `${m.cpu_temp.toFixed(1)}°C` : "—"}
                                        </span>
                                    </span>
                                    <span className="v2-ctrl-stat">
                                        <span className="v2-ctrl-k">디스크</span>
                                        <span className={`v2-ctrl-v ${m.disk_usage == null || m.disk_usage >= 75 ? "red" : ""}`}>
                                            {m.disk_usage != null ? `${m.disk_usage}%` : "—"}
                                            {m.disk_used_gb != null && m.disk_total_gb != null && (
                                                <span className="v2-muted"> {m.disk_used_gb}/{m.disk_total_gb}</span>
                                            )}
                                        </span>
                                        {m.disk_usage != null && (
                                            <span className="v2-ctrl-bar" aria-hidden="true">
                                                <span className={diskTone(m.disk_usage)}
                                                    style={{ width: `${Math.min(Math.max(m.disk_usage, 0), 100)}%` }} />
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </main>

            {detail && (
                <div className="v2-sheet-overlay" onClick={closeDetail}>
                    <div className="v2-sheet v2-ctrl-sheet" onClick={(e) => e.stopPropagation()} role="dialog"
                        aria-label={`${parseInt(detail.id, 10)}번 모듈 상세`}>
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <div className="v2-ctrl-sheet-head">
                            <span className="v2-ctrl-id">{parseInt(detail.id, 10)}</span>
                            <strong>{detail.site_name ?? "—"}</strong>
                            <span className={`v2-status ${connectionMeta(detail.last_status).tone}`}>
                                {connectionMeta(detail.last_status).label}
                            </span>
                        </div>
                        {freshnessOf(detail).label && (
                            <p className="v2-ctrl-note">
                                {freshnessOf(detail).state === "withdrawn"
                                    ? "최근 7일 넘게 수집에 성공하지 못해 철수한 모듈로 보입니다."
                                    : `${freshnessOf(detail).label} · 3일 넘게 수집에 성공하지 못했습니다.`}
                            </p>
                        )}

                        <DetailSection title="연결·수집">
                            <Row k="최근 수집" v={`${formatAgoDate(lastCollectTime(detail))} (${formatDateTime(lastCollectTime(detail))})`} />
                            <Row k="최근 성공" v={formatDateTime(detail.last_success_time)} />
                            <Row k="최근 시도" v={formatDateTime(detail.last_attempt_time)} />
                            <Row k="최근 로그" v={formatDateTime(detail.last_log_time)} />
                            <Row k="상태" v={detail.last_status ?? "데이터 없음"} />
                            <Row k="IP" v={detail.ip} mono />
                        </DetailSection>

                        <DetailSection title="촬영">
                            <Row k="시간·간격" v={<ScheduleText module={detail} />} />
                            {detail.schedule_change && detail.schedule_change.status !== "applied" && detail.schedule_change.message && (
                                <Row k="변경 상태" v={detail.schedule_change.message} />
                            )}
                        </DetailSection>

                        <DetailSection title="장치">
                            <Row k="CPU 온도" v={detail.cpu_temp != null ? `${detail.cpu_temp.toFixed(1)}°C` : "—"}
                                tone={tempTone(detail.cpu_temp)} />
                            <Row k="디스크"
                                v={detail.disk_usage != null
                                    ? `${detail.disk_usage}%${detail.disk_used_gb != null && detail.disk_total_gb != null
                                        ? ` (${detail.disk_used_gb}/${detail.disk_total_gb} GB)` : ""}`
                                    : "—"}
                                tone={detail.disk_usage == null || detail.disk_usage >= 75 ? "red" : detail.disk_usage >= 60 ? "orange" : ""} />
                            <Row k="Pi 모델" v={detail.pi_model ? `${formatPiModel(detail.pi_model)} · ${detail.pi_model}` : "—"}
                                tone={detail.pi_model == null ? "red" : ""} />
                            <Row k="OS" v={detail.os_version ? `${formatOsVersion(detail.os_version)} · ${detail.os_version}` : "—"} />
                        </DetailSection>

                        <DetailSection title="카메라">
                            <Row k="기종" v={isUnknownCamera(detail.camera_model) ? (detail.camera_model ?? "—") : cameraLabel(detail.camera_model)}
                                tone={isUnknownCamera(detail.camera_model) ? "red" : ""} />
                            <Row k="노출보정" v={formatExpComp(detail.exposure_comp)} />
                            <Row k="ISO" v={detail.iso != null ? String(detail.iso) : "—"} />
                            <Row k="포커스" v={detail.focus_mode ? detail.focus_mode.replace(/\s*\(.*\)/, "") : "—"} />
                            <Row k="화질" v={detail.img_quality} tone={detail.img_quality == null ? "red" : ""} />
                            <Row k="해상도" v={detail.img_size} />
                        </DetailSection>

                        <DetailSection title="모듈">
                            <Row k="유형" v={detail.type === "modern" ? "현행 (bmtl-module)" : `레거시${detail.type ? ` (${detail.type})` : ""}`} />
                            <Row k="현재 버전" v={detail.module_version} mono />
                            <Row k="최신 버전" v={detail.type === "modern"
                                ? `${detail.latest_module_version || "-"} · ${getModuleUpdateState(detail.type, detail.is_latest)}`
                                : "-"} />
                            {detailUpdate?.status && (
                                <Row k="업데이트" v={[getUpdatePhaseLabel(detailUpdate.status), detailUpdate.message]
                                    .filter(Boolean).join(" · ")}
                                    tone={detailUpdate.status === "failed" ? "red" : detailUpdate.status === "completed" ? "green" : "orange"} />
                            )}
                        </DetailSection>

                        <div className="v2-ctrl-actions">
                            <button type="button" className="v2-btn" onClick={() => setHistoryOpen(true)}>이력 보기</button>
                            <button type="button" className="v2-btn" onClick={() => setScheduleOpen(true)}>촬영 시간·간격 변경</button>
                            <button
                                type="button"
                                className="v2-btn"
                                disabled={detail.type !== "modern"}
                                onClick={() => openUpdateDialog(detail)}
                            >
                                {detail.type !== "modern"
                                    ? "모듈 업데이트 (레거시 미지원)"
                                    : detailUpdate?.status === "in_progress" ? "업데이트 진행 상황" : "모듈 업데이트"}
                            </button>
                        </div>
                        <button type="button" className="v2-menu-close" onClick={closeDetail}>닫기</button>
                    </div>
                </div>
            )}

            {detail && historyOpen && (
                <div className="v2-ctrl-layer">
                    <HistoryModal module={detail} onClose={() => setHistoryOpen(false)} />
                </div>
            )}

            {detail && scheduleOpen && (
                <div className="schedule-sheet v2-ctrl-layer">
                    <ScheduleDialog module={detail} onClose={() => setScheduleOpen(false)} onSaved={fetchData} />
                </div>
            )}

            {updateDialog && (
                <div className="v2-sheet-overlay v2-ctrl-top" onClick={() => setUpdateDialog(null)}>
                    <div className="v2-sheet v2-ctrl-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="모듈 업데이트">
                        <div className="v2-sheet-handle" aria-hidden="true" />
                        <h2 className="v2-ctrl-dialog-title">모듈 업데이트</h2>
                        <p className="v2-ctrl-dialog-text">
                            <strong>{updateDialog.module.site_name}</strong>
                            {" "}
                            ({parseInt(updateDialog.module.id, 10)}) {updateDialog.phase === "latest"
                                ? "모듈은 최신입니다."
                                : "모듈을 업데이트하시겠습니까?"}
                        </p>
                        <p className="v2-ctrl-dialog-sub">현재 버전: {updateDialog.module.module_version || "-"}</p>
                        <p className="v2-ctrl-dialog-sub">
                            최신 버전: {updateDialog.module.latest_module_version || "-"} · {getModuleUpdateState(updateDialog.module.type, updateDialog.module.is_latest)}
                        </p>
                        {dialogStatus === "in_progress" && (
                            <p className="v2-ctrl-dialog-sub v2-ctrl-progress">
                                <span className="v2-ctrl-dot-spin" aria-hidden="true" />
                                작업 ID: {updateStatuses[updateDialog.module.id]?.jobId || "-"} · 업데이트 진행 중
                            </p>
                        )}
                        {updateDialog.message && (
                            <p className={`v2-ctrl-dialog-status ${updateDialog.phase === "failed" ? "red" : updateDialog.phase === "completed" ? "green" : ""}`}>
                                {updateDialog.message}
                            </p>
                        )}
                        <div className="v2-ctrl-dialog-actions">
                            <button type="button" className="v2-btn" onClick={() => setUpdateDialog(null)}>
                                {updateDialog.phase === "confirm" ? "취소" : "닫기"}
                            </button>
                            {updateDialog.phase !== "latest" && (
                                <button
                                    type="button"
                                    className="v2-btn v2-ctrl-primary"
                                    onClick={startUpdate}
                                    disabled={
                                        !["confirm", "failed"].includes(updateDialog.phase)
                                        || !(updateDialog.module.type === "modern" && updateDialog.module.is_latest !== true)
                                        || dialogStatus === "in_progress"
                                    }
                                >
                                    {updateDialog.phase === "submitting"
                                        ? "요청 중..."
                                        : dialogStatus === "in_progress" ? "진행 중" : "확인"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`v2-ctrl-toast ${toast.tone}`} role="status">
                    <span>{toast.message}</span>
                    <button type="button" onClick={() => setToast(null)} aria-label="알림 닫기">✕</button>
                </div>
            )}
        </div>
    );
}

function DetailSection({ title, children }) {
    return (
        <section className="v2-ctrl-section">
            <h3>{title}</h3>
            <dl>{children}</dl>
        </section>
    );
}

function Row({ k, v, tone = "", mono = false }) {
    return (
        <div className="v2-ctrl-row">
            <dt>{k}</dt>
            <dd className={`${tone}${mono ? " mono" : ""}`}>{v ?? "—"}</dd>
        </div>
    );
}
