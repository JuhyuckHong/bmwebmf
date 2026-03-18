import { useState, useEffect, useCallback } from "react";
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

const HOUR_OPTIONS = [12, 24, 48, 72];

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

    // Build chart data: each snapshot becomes a point, timestamp as numeric key
    const chartData = snapshots.map((s) => ({
        ts: new Date(s.ts).getTime(),
        temp: s.temp ?? null,
        mem: s.mem ?? null,
        disk: s.disk ?? null,
        status: s.status,
    }));

    // Merge all event timestamps for ReferenceLine
    const hwTimes = hardwareEvents.map((e) => new Date(e.occurred_at).getTime());
    const cfgTimes = configEvents.map((e) => new Date(e.occurred_at).getTime());

    const allEvents = [
        ...hardwareEvents.map((e) => ({ ...e, kind: "hardware" })),
        ...configEvents.map((e) => ({ ...e, kind: "config" })),
    ].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));

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
                                {h}h
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
                            ) : (
                                <div className="hist-charts-row">
                                    {/* CPU 온도 */}
                                    <div className="hist-chart-panel">
                                        <div className="hist-chart-label" style={{ color: "#ef4444" }}>CPU 온도</div>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                                <XAxis dataKey="ts" type="number" scale="time" domain={["auto", "auto"]} tickFormatter={fmtAxisTime} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickCount={4} />
                                                <YAxis domain={[0, 70]} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickFormatter={(v) => `${v}°`} width={32} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1} label={{ value: "50°C", position: "insideTopRight", fontSize: 9, fill: "#ef4444" }} />
                                                {hwTimes.map((t, i) => <ReferenceLine key={`hw-${i}`} x={t} stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                {cfgTimes.map((t, i) => <ReferenceLine key={`cfg-${i}`} x={t} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                <Line type="monotone" dataKey="temp" name="CPU 온도" stroke="#ef4444" strokeWidth={1.5} dot={false} unit="°C" connectNulls />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 메모리 */}
                                    <div className="hist-chart-panel">
                                        <div className="hist-chart-label" style={{ color: "#f59e0b" }}>메모리</div>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                                <XAxis dataKey="ts" type="number" scale="time" domain={["auto", "auto"]} tickFormatter={fmtAxisTime} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickCount={4} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickFormatter={(v) => `${v}%`} width={32} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1} label={{ value: "90%", position: "insideTopRight", fontSize: 9, fill: "#f59e0b" }} />
                                                {hwTimes.map((t, i) => <ReferenceLine key={`hw-${i}`} x={t} stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                {cfgTimes.map((t, i) => <ReferenceLine key={`cfg-${i}`} x={t} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                <Line type="monotone" dataKey="mem" name="메모리" stroke="#f59e0b" strokeWidth={1.5} dot={false} unit="%" connectNulls />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* 디스크 */}
                                    <div className="hist-chart-panel">
                                        <div className="hist-chart-label" style={{ color: "#22c55e" }}>디스크</div>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                                <XAxis dataKey="ts" type="number" scale="time" domain={["auto", "auto"]} tickFormatter={fmtAxisTime} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickCount={4} />
                                                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--muted-text-color)" }} tickFormatter={(v) => `${v}%`} width={32} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1} label={{ value: "75%", position: "insideTopRight", fontSize: 9, fill: "#22c55e" }} />
                                                {hwTimes.map((t, i) => <ReferenceLine key={`hw-${i}`} x={t} stroke="#a855f7" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                {cfgTimes.map((t, i) => <ReferenceLine key={`cfg-${i}`} x={t} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} />)}
                                                <Line type="monotone" dataKey="disk" name="디스크" stroke="#22c55e" strokeWidth={1.5} dot={false} unit="%" connectNulls />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {allEvents.length > 0 && (
                                <div className="hist-events">
                                    <div className="hist-events-title">이벤트</div>
                                    <ul className="hist-events-list">
                                        {allEvents.map((e, i) => (
                                            <li key={i} className={`hist-event-row ${e.kind}`}>
                                                <span className="hist-event-icon">
                                                    {e.kind === "hardware" ? "🛠" : "⚙️"}
                                                </span>
                                                <span className="hist-event-time">{fmtEventTime(e.occurred_at)}</span>
                                                <span className="hist-event-field">{e.field ?? e.type ?? ""}</span>
                                                {e.from_value != null && (
                                                    <span className="hist-event-change">
                                                        <span className="hist-event-from">{String(e.from_value)}</span>
                                                        <span className="hist-event-arrow">→</span>
                                                        <span className="hist-event-to">{String(e.to_value)}</span>
                                                    </span>
                                                )}
                                                {e.description && (
                                                    <span className="hist-event-desc">{e.description}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {allEvents.length === 0 && chartData.length > 0 && (
                                <div className="hist-no-events">이벤트 없음</div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
