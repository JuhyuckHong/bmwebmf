import { useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import "../CSS/Control.css";
import HistoryModal from "./HistoryModal";

const REFRESH_INTERVAL = 30000;

function formatTime(dt) {
    if (!dt) return "—";
    const d = new Date(dt);
    const mo = String(d.getMonth() + 1);
    const day = String(d.getDate());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${mo}/${day}, ${hh}:${mm}`;
}

const w = (cond) => cond ? " ctrl-warn-bg" : "";

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

function CpuTempBadge({ temp }) {
    if (temp == null) return <span className="ctrl-mono muted">—</span>;
    const cls = temp >= 50 ? "hot" : temp >= 40 ? "warm" : "cool";
    return <span className={`cpu-temp ${cls}`}>{temp.toFixed(1)}°C</span>;
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
                    <span className="usage-pie-gb">{used}/{total}GB</span>}
            </div>
        </div>
    );
}

function StatusTypeBadge({ status, type }) {
    const cls = (status === "SUCCESS" || status === "PARTIAL") ? "success" : status === "ERROR" ? "error" : "unknown";
    const label = type === "modern" ? "M" : "L";
    return (
        <span className={`status-type-badge ${cls}`} title={`${type} · ${status ?? "데이터 없음"}`}>
            {label}
        </span>
    );
}

export default function ControlPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastFetched, setLastFetched] = useState(null);
    const [filter, setFilter] = useState("");
    const [selectedModule, setSelectedModule] = useState(null);

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
              m.camera_model ? m.camera_model.replace(/^Nikon DSC\s*/i, "") : null,
              m.iso != null ? String(m.iso) : null,
              m.exposure_comp != null ? formatExpComp(m.exposure_comp) : null,
              m.focus_mode,
              m.img_quality,
              m.img_size,
          ].some((v) => v && String(v).toLowerCase().includes(q)))
        : modules;

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
                        <span className="ctrl-stat-pill error">{errorCount} 오류</span>
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
                {error && <div className="logs-error">오류: {error}</div>}
                {loading && (
                    <div className="control-loading">데이터 불러오는 중...</div>
                )}

                {!loading && !error && (
                    <div className="control-table-outer">
                    <div className="control-table-wrap">
                        <div className="control-table-header">
                            <span>ID</span>
                            <span>현장명</span>
                            <span>상태</span>
                            <span>CPU</span>
                            <span>메모리</span>
                            <span>디스크</span>
                            <span>Pi</span>
                            <span>OS</span>
                            <span>카메라</span>
                            <span>ISO</span>
                            <span>노출보정</span>
                            <span>포커스</span>
                            <span>화질 / 해상도</span>
                            <span>마지막 로그</span>
                        </div>
                        <ul className="control-table-list">
                            {filtered.length === 0 ? (
                                <li className="control-empty">
                                    검색 결과가 없습니다.
                                </li>
                            ) : (
                                filtered.map((m) => (
                                    <li
                                        key={m.id}
                                        className={`control-row ${
                                            m.last_status === "ERROR"
                                                ? "row-error"
                                                : !m.last_status
                                                  ? "row-unknown"
                                                  : ""
                                        }`}
                                        onClick={() => setSelectedModule(m)}
                                        style={{ cursor: "pointer" }}>
                                        <span className="ctrl-id">{parseInt(m.id, 10)}</span>
                                        <span className="ctrl-name"><Highlight text={m.site_name} query={q} /></span>
                                        <span className="ctrl-cell"><StatusTypeBadge status={m.last_status} type={m.type} /></span>
                                        <span className={`ctrl-cell${w(m.cpu_temp == null || m.cpu_temp >= 50)}`}><CpuTempBadge temp={m.cpu_temp} /></span>
                                        <UsagePie value={m.mem_usage} alertAt={90} />
                                        <UsagePie value={m.disk_usage} used={m.disk_used_gb} total={m.disk_total_gb} warnAt={60} dangerAt={75} alertAt={75} />
                                        <span className={`ctrl-sub${w(m.pi_model == null)}`}><Highlight text={formatPiModel(m.pi_model)} query={q} /></span>
                                        <span className={`ctrl-sub${w(m.os_version == null)}`}><Highlight text={m.os_version} query={q} /></span>
                                        <span className={`ctrl-sub${w(!m.camera_model || /^USB PTP Class Camera$/i.test(m.camera_model.trim()))}`}><Highlight text={(m.camera_model && !/^USB PTP Class Camera$/i.test(m.camera_model.trim())) ? m.camera_model.replace(/^Nikon DSC\s*/i, "") : null} query={q} /></span>
                                        <span className={`ctrl-sub${w(m.iso == null)}`}><Highlight text={m.iso != null ? String(m.iso) : null} query={q} /></span>
                                        <span className={`ctrl-sub${w(m.exposure_comp == null)}`}><Highlight text={formatExpComp(m.exposure_comp)} query={q} /></span>
                                        <span className={`ctrl-sub${w(m.focus_mode == null)}`}><Highlight text={m.focus_mode} query={q} /></span>
                                        <span className={`ctrl-mono ctrl-col${w(m.img_quality == null)}`}>
                                            <span className="ctrl-mono ctrl-sub"><Highlight text={m.img_quality} query={q} /></span>
                                            {m.img_size ? <span className="ctrl-sub"><Highlight text={m.img_size} query={q} /></span> : null}
                                        </span>
                                        <span className="ctrl-time ctrl-sub">
                                            {formatTime(m.last_success_time !== m.last_attempt_time
                                                ? m.last_success_time
                                                : (m.last_attempt_time ?? m.last_log_time))}
                                        </span>
                                    </li>
                                ))
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
        </>
    );
}
