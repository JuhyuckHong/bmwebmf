import { useState, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import { API } from "../API";
import "../CSS/HistoryModal.css";

const HOUR_OPTIONS = [0, 12, 24, 48, 72];

const CHART_OPTIONS = [
    { key: "temp", label: "CPU 온도", dataKey: "temp", color: "#ef4444", unit: "°C", domain: [0, 70], tickFormatter: (v) => `${v}°`, refY: 50, refLabel: "50°C" },
    { key: "mem",  label: "메모리",   dataKey: "mem",  color: "#f59e0b", unit: "%",  domain: [0, 100], tickFormatter: (v) => `${v}%`, refY: 90, refLabel: "90%" },
    { key: "disk", label: "디스크",   dataKey: "disk", color: "#22c55e", unit: "%",  domain: [0, 100], tickFormatter: (v) => `${v}%`, refY: 75, refLabel: "75%" },
];

function formatExpComp(val) {
    if (val == null) return null;
    const n = parseFloat(val);
    if (isNaN(n)) return String(val);
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
    if (!raw) return null;
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

function fmtHHMM(t) {
    if (!t || t.length < 4) return null;
    return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
}

function formatModuleVersion(version) {
    if (!version) return null;
    const parts = String(version).split(".");
    if (parts.length >= 3) return `${parts[1]}.${parts[2]}`;
    if (parts.length >= 2) return parts.slice(1).join(".") || String(version);
    return String(version);
}

function fmtEventVal(type, val) {
    if (val == null) return "—";
    const s = String(val);
    if (type === "camera_serial") return s.replace(/^0+|0+$/g, "") || s;
    if (type === "module_version") return formatModuleVersion(s) ?? s;
    return s;
}

const FIELD_GROUPS = [
    {
        group: "카메라 세팅",
        fields: [
            { key: "camera_model",  label: "카메라",      kind: "config",   getValue: (m) => m.camera_model ? m.camera_model.replace(/^Nikon DSC\s*/i, "").replace(/\s*\(.*?\)/g, "").trim() : null },
            { key: "camera_serial", label: "시리얼",      kind: "hardware", getValue: (m) => m.camera_serial ? m.camera_serial.replace(/^0+|0+$/g, "") || m.camera_serial : null },
            { key: "iso",           label: "ISO",         kind: "config",   getValue: (m) => m.iso != null ? String(m.iso) : null },
            { key: "exposure_comp", label: "노출보정",     kind: "config",   getValue: (m) => formatExpComp(m.exposure_comp) },
            { key: "focus_mode",    label: "포커스 모드",  kind: "config",   getValue: (m) => m.focus_mode ?? null },
            { key: "img_quality",   label: "화질",         kind: "config",   getValue: (m) => m.img_quality ?? null },
            { key: "img_size",      label: "해상도",        kind: "config",  getValue: (m) => m.img_size ?? null },
        ],
    },
    {
        group: "모듈 정보",
        fields: [
            { key: "module_version", label: "모듈 버전", kind: "update", getValue: (m) => formatModuleVersion(m.module_version) },
            { key: "pi_model",      label: "Pi 모델",     kind: "hardware", getValue: (m) => formatPiModel(m.pi_model) },
            { key: "os_version",    label: "OS",           kind: "hardware", getValue: (m) => m.os_version ?? null },
        ],
    },
    {
        group: "운영 정보",
        fields: [
            { key: "site_name",     label: "현장명",       kind: "config",   getValue: (m) => m.site_name ?? null },
            { key: "time_start",    label: "촬영 시작",    kind: "config",   getValue: (m) => fmtHHMM(m.time_start) },
            { key: "time_end",      label: "촬영 종료",    kind: "config",   getValue: (m) => fmtHHMM(m.time_end) },
            { key: "time_interval", label: "촬영 간격",    kind: "config",   getValue: (m) => m.time_interval != null ? `${m.time_interval}분` : null },
        ],
    },
];

function fmtAxisTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const mo = String(d.getMonth() + 1);
    const day = String(d.getDate());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${mo}/${day} ${hh}:${mm}`;
}

function fmtEventTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const mo = String(d.getMonth() + 1);
    const day = String(d.getDate());
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${mo}/${day} ${hh}:${mm}`;
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="hist-tooltip">
            <div className="hist-tooltip-time">{fmtAxisTime(label)}</div>
            {payload.map((p) => (
                <div key={p.dataKey} className="hist-tooltip-row" style={{ color: p.color }}>
                    <span className="hist-tooltip-name">{p.name}</span>
                    <span className="hist-tooltip-val">
                        {p.value != null ? `${p.value}${p.unit ?? ""}` : "—"}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function HistoryModal({ module, onClose }) {
    const [hours, setHours] = useState(24);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [eventsView, setEventsView] = useState("fields");
    const [chartView, setChartView] = useState("temp");

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = { Authorization: Cookies.get("BM") };
            const res = await API.getHistory(headers, module.id, hours);
            setData(res.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [module.id, hours]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const snapshots = data?.metrics ?? [];
    const hardwareEvents = data?.hardware_events ?? [];
    const configEvents = data?.config_events ?? [];
    const updateEvents = data?.update_events ?? [];

    // Build chart data: each snapshot becomes a point, timestamp as numeric key
    const chartData = snapshots.map((s) => ({
        ts: new Date(s.ts).getTime(),
        temp: s.temp ?? null,
        mem: s.mem ?? null,
        disk: s.disk ?? null,
        status: s.status,
    }));

    // Merge all event timestamps for ReferenceLine
    const hwTimes = hardwareEvents.map((e) => new Date(e.ts).getTime());
    const cfgTimes = configEvents.map((e) => new Date(e.ts).getTime());
    const updTimes = updateEvents.map((e) => new Date(e.ts).getTime());

    const allEvents = [
        ...hardwareEvents.map((e) => ({ ...e, kind: "hardware" })),
        ...configEvents.map((e) => ({ ...e, kind: "config" })),
        ...updateEvents.map((e) => ({ ...e, kind: "update" })),
    ].sort((a, b) => new Date(a.ts) - new Date(b.ts));

    // 필드별 이벤트 목록 (시간순)
    const eventsByType = useMemo(() => {
        const map = {};
        for (const e of allEvents) {
            if (!e.type) continue;
            if (!map[e.type]) map[e.type] = [];
            map[e.type].push(e);
        }
        return map;
    }, [allEvents]);

    return (
        <div className="hist-overlay" onClick={onClose}>
            <div className="hist-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hist-header">
                    <div className="hist-title">
                        <span className="hist-module-id">{parseInt(module.id, 10)}</span>
                        <span className="hist-module-name">{module.site_name}</span>
                        <span className="hist-subtitle">히스토리</span>
                    </div>
                    <div className="hist-controls">
                        {HOUR_OPTIONS.map((h) => (
                            <button
                                key={h}
                                className={`hist-hour-btn${hours === h ? " active" : ""}`}
                                onClick={() => setHours(h)}
                            >
                                {h === 0 ? "전체" : `${h}h`}
                            </button>
                        ))}
                        <button className="hist-close-btn" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="hist-body">
                    {loading && <div className="hist-loading">데이터 불러오는 중...</div>}
                    {error && <div className="hist-error">오류: {error}</div>}

                    {!loading && !error && (
                        <>
                            {chartData.length === 0 ? (
                                <div className="hist-empty">데이터가 없습니다.</div>
                            ) : (() => {
                                const active = CHART_OPTIONS.find((c) => c.key === chartView) ?? CHART_OPTIONS[0];
                                return (
                                    <div className="hist-chart-panel">
                                        <div className="hist-chart-toolbar">
                                            <div className="hist-tab-group">
                                                {CHART_OPTIONS.map((c) => (
                                                    <button
                                                        key={c.key}
                                                        className={`hist-tab-btn${chartView === c.key ? " active" : ""}`}
                                                        style={chartView === c.key ? { color: c.color, borderColor: c.color } : undefined}
                                                        onClick={() => setChartView(c.key)}
                                                    >{c.label}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <ResponsiveContainer width="100%" height={240}>
                                            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                                <XAxis dataKey="ts" type="number" scale="time" domain={["auto", "auto"]} tickFormatter={fmtAxisTime} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickCount={4} />
                                                <YAxis domain={active.domain} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickFormatter={active.tickFormatter} width={32} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <ReferenceLine y={active.refY} stroke={active.color} strokeDasharray="6 3" strokeWidth={1} label={{ value: active.refLabel, position: "insideTopRight", fontSize: 9, fill: active.color }} />
                                                {hwTimes.map((t, i) => <ReferenceLine key={`hw-${i}`} x={t} stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                {cfgTimes.map((t, i) => <ReferenceLine key={`cfg-${i}`} x={t} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                {updTimes.map((t, i) => <ReferenceLine key={`upd-${i}`} x={t} stroke="#16a34a" strokeDasharray="2 2" strokeWidth={1.5} />)}
                                                <Line type="monotone" dataKey={active.dataKey} name={active.label} stroke={active.color} strokeWidth={1.5} dot={false} unit={active.unit} connectNulls />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })()}

                            <div className="hist-events">
                                <div className="hist-events-title">
                                    <span>변경 이력</span>
                                    <div className="hist-tab-group">
                                        <button
                                            className={`hist-tab-btn${eventsView === "fields" ? " active" : ""}`}
                                            onClick={() => setEventsView("fields")}
                                        >필드 현황</button>
                                        <button
                                            className={`hist-tab-btn${eventsView === "events" ? " active" : ""}`}
                                            onClick={() => setEventsView("events")}
                                        >이벤트 목록{allEvents.length > 0 ? ` (${allEvents.length})` : ""}</button>
                                    </div>
                                </div>

                                {eventsView === "fields" && (
                                    <div className="hist-fields-body">
                                        {FIELD_GROUPS.map(({ group, fields }) => (
                                            <div key={group} className="hist-field-group">
                                                <div className="hist-field-group-title">{group}</div>
                                                {fields.map((field) => {
                                                    const events = eventsByType[field.key] ?? [];
                                                    const currentVal = field.getValue(module);
                                                    const fieldColor = field.kind === "hardware"
                                                        ? "#a855f7"
                                                        : field.kind === "update"
                                                            ? "#16a34a"
                                                            : "#3b82f6";
                                                    return (
                                                        <div key={field.key} className={`hist-field-row${events.length > 0 ? ` changed ${field.kind}` : " no-change"}`}>
                                                            <span className="hist-field-label" style={events.length > 0 ? { color: fieldColor } : undefined}>{field.label}</span>
                                                            <span className="hist-field-value">{currentVal ?? "—"}</span>
                                                            {events.length > 0 ? (
                                                                <span className="hist-field-chain">
                                                                    {events[0].from != null && (
                                                                        <span className="hist-chain-origin">{fmtEventVal(field.key, events[0].from)}</span>
                                                                    )}
                                                                    {events.map((ev, i) => (
                                                                        <span key={i} className="hist-chain-step">
                                                                            <span className="hist-chain-arrow">→</span>
                                                                            <span className="hist-event-to">{fmtEventVal(field.key, ev.to)}</span>
                                                                            <span className="hist-field-time">{fmtEventTime(ev.ts)}</span>
                                                                        </span>
                                                                    ))}
                                                                </span>
                                                            ) : (
                                                                <span className="hist-field-nochange">변경 없음</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {eventsView === "events" && (
                                    allEvents.length === 0 ? (
                                        <div className="hist-no-events">이 기간 내 이벤트 없음</div>
                                    ) : (
                                        <ul className="hist-events-list">
                                            {allEvents.map((e, i) => (
                                                <li key={i} className={`hist-event-row ${e.kind}`}>
                                                    <span className="hist-event-icon">
                                                        {e.kind === "hardware" ? "🛠" : e.kind === "update" ? "UP" : "⚙️"}
                                                    </span>
                                                    <span className="hist-event-time">{fmtEventTime(e.ts)}</span>
                                                    <span className="hist-event-field">{e.type ?? ""}</span>
                                                    {e.from != null && (
                                                        <span className="hist-event-change">
                                                            <span className="hist-event-from">{fmtEventVal(e.type, e.from)}</span>
                                                            <span className="hist-event-arrow">→</span>
                                                            <span className="hist-event-to">{fmtEventVal(e.type, e.to)}</span>
                                                        </span>
                                                    )}
                                                    {e.description && (
                                                        <span className="hist-event-desc">{e.description}</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
