import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { API } from "../API";
import { toHHMM, toTimeInput } from "./scheduleUtils";
import {
    DURATION_OPTIONS,
    LAST_RESULT_LABELS,
    WIPER_ACTION_LABELS,
    nowHHMM,
    overlapsShooting,
} from "./wiperUtils";

const headers = () => ({ Authorization: Cookies.get("BM") });
// 작동이 끝난 뒤 로그를 다시 읽기까지 더 기다리는 시간
const RUN_SETTLE_MS = 8000;

export default function WiperDialog({ module, onClose }) {
    const isLegacy = module.type !== "modern";
    const [state, setState] = useState(null);
    const [actions, setActions] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState(30);
    const [phase, setPhase] = useState("edit"); // edit | saving | running
    const [result, setResult] = useState(null);

    const load = useCallback(async (keepResult = false) => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await API.getModuleWiper(headers(), module.id);
            const next = res.data?.state;
            setState(next);
            setActions(res.data?.actions ?? []);
            setEnabled(Boolean(next?.enabled));
            setTime(toTimeInput(next?.time) || "04:00");
            setDuration(next?.duration ?? 30);
            if (!keepResult) setResult(null);
        } catch (err) {
            setLoadError(err.response?.data?.message ?? err.message ?? "모듈에서 와이퍼 정보를 읽지 못했습니다.");
            setActions(err.response?.data?.actions ?? []);
        } finally {
            setLoading(false);
        }
    }, [module.id]);

    useEffect(() => { load(); }, [load]);

    const wiperTime = isLegacy ? toHHMM(time) : state?.time;
    const overlap = enabled && wiperTime && overlapsShooting(module.time_start, module.time_end, wiperTime, duration);
    const unchanged = state && enabled === state.enabled
        && (isLegacy ? wiperTime === state.time : Number(duration) === state.duration);
    const editable = state && (isLegacy ? state.time_editable : state.duration_editable);
    const busy = phase !== "edit";

    const save = async () => {
        if (overlap && !window.confirm("와이퍼 시각이 촬영 시간대와 겹칩니다. 그래도 저장할까요?")) return;
        setPhase("saving");
        try {
            const body = isLegacy ? { enabled, time: wiperTime } : { enabled, duration: Number(duration) };
            const res = await API.setModuleWiper(headers(), module.id, body);
            setResult({ ok: true, message: res.data?.message, warnings: res.data?.warnings ?? [] });
            await load(true);
        } catch (err) {
            setResult({ ok: false, message: err.response?.data?.message ?? err.message });
        } finally {
            setPhase("edit");
        }
    };

    const runNow = async () => {
        const shooting = overlapsShooting(module.time_start, module.time_end, nowHHMM(), state?.duration ?? 30);
        const question = shooting
            ? "지금은 촬영 시간대입니다. 와이퍼가 작동하는 동안 사진이 가려질 수 있습니다. 작동할까요?"
            : "와이퍼를 지금 한 번 작동할까요?";
        if (!window.confirm(question)) return;
        setPhase("running");
        setResult(null);
        try {
            const res = await API.runModuleWiper(headers(), module.id);
            setResult({ ok: true, message: `${res.data?.message} 끝나면 결과를 다시 확인합니다.` });
            const waitMs = (state?.duration ?? 30) * 1000 + RUN_SETTLE_MS;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            await load(true);
            setResult({ ok: true, message: "와이퍼 작동이 끝났습니다. 아래 '마지막 작동'을 확인해 주세요." });
        } catch (err) {
            setResult({ ok: false, message: err.response?.data?.message ?? err.message });
        } finally {
            setPhase("edit");
        }
    };

    return (
        <div className="control-modal-overlay" onClick={busy ? undefined : onClose}>
            <div className="control-confirm-modal schedule-dialog" onClick={(e) => e.stopPropagation()}>
                <h3 className="control-confirm-title">와이퍼</h3>
                <p className="control-confirm-text">
                    <strong>{module.site_name}</strong> ({parseInt(module.id, 10)}) · {isLegacy ? "레거시" : "현행"} 모듈
                </p>

                {loading && (
                    <p className="schedule-progress">
                        <span className="schedule-spinner" aria-hidden="true" />
                        모듈에 접속해 와이퍼 설정을 읽는 중입니다...
                    </p>
                )}
                {loadError && !loading && (
                    <>
                        <p className="control-confirm-status schedule-warn">{loadError}</p>
                        <div className="control-confirm-actions">
                            <button className="admin-btn" onClick={() => load()}>다시 시도</button>
                        </div>
                    </>
                )}

                {state && !loadError && (
                    <>
                        <div className="wiper-facts">
                            <span>마지막 작동</span>
                            <strong>
                                {state.last_started_at
                                    ? `${state.last_started_at.slice(5, 16)} · ${LAST_RESULT_LABELS[state.last_result] ?? "확인 불가"}`
                                    : state.last_result === "skipped"
                                        ? `${state.last_finished_at?.slice(5, 16)} · 건너뜀 (사용 꺼짐)`
                                        : "기록 없음"}
                            </strong>
                            <span>와이퍼 핀</span>
                            <strong>{state.pin ?? "알 수 없음"}{isLegacy ? " (코드 고정)" : ""}</strong>
                            {state.next_run && (
                                <>
                                    <span>다음 정기 작동</span>
                                    <strong>{state.enabled ? state.next_run : "사용 꺼짐"}</strong>
                                </>
                            )}
                            {state.running && (
                                <>
                                    <span>상태</span>
                                    <strong>지금 작동 중</strong>
                                </>
                            )}
                        </div>
                        {state.notes?.map((note) => (
                            <p key={note} className="control-confirm-subtext">⚠ {note}</p>
                        ))}

                        <div className="schedule-apply">
                            <label className={enabled ? "selected" : ""}>
                                <input type="radio" name="wiper_enabled" checked={enabled}
                                    onChange={() => setEnabled(true)} disabled={busy || !editable} />
                                <span>
                                    <strong>매일 정기 작동</strong>
                                    <small>{isLegacy ? "아래 시각에 하루 한 번" : `매일 ${toTimeInput(state.time)} (시각 고정)`}</small>
                                </span>
                            </label>
                            <label className={!enabled ? "selected" : ""}>
                                <input type="radio" name="wiper_enabled" checked={!enabled}
                                    onChange={() => setEnabled(false)} disabled={busy || !editable} />
                                <span>
                                    <strong>사용 안 함</strong>
                                    <small>{isLegacy ? "정기 작동만 끕니다. 수동 작동은 할 수 있습니다." : "정기 작동과 수동 작동을 모두 끕니다."}</small>
                                </span>
                            </label>
                        </div>

                        <div className="schedule-form">
                            {isLegacy ? (
                                <label>
                                    <span>작동 시각</span>
                                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                                        disabled={busy || !editable || !enabled} />
                                </label>
                            ) : (
                                <label>
                                    <span>작동 시간</span>
                                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                                        disabled={busy || !editable}>
                                        {[...new Set([...DURATION_OPTIONS, state.duration])].sort((a, b) => a - b).map((v) => (
                                            <option key={v} value={v}>{v}초</option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <label>
                                <span>{isLegacy ? "작동 시간" : "촬영 시간"}</span>
                                <input type="text" readOnly
                                    value={isLegacy
                                        ? `${state.duration ?? "?"}초 (코드 고정)`
                                        : `${toTimeInput(module.time_start)}~${toTimeInput(module.time_end)}`} />
                            </label>
                        </div>

                        {overlap && (
                            <p className="control-confirm-status schedule-warn">
                                와이퍼 시각이 촬영 시간대({toTimeInput(module.time_start)}~{toTimeInput(module.time_end)})와 겹칩니다.
                            </p>
                        )}
                        {phase === "saving" && (
                            <p className="schedule-progress">
                                <span className="schedule-spinner" aria-hidden="true" />
                                모듈에 저장하는 중입니다...
                            </p>
                        )}
                        {phase === "running" && (
                            <p className="schedule-progress">
                                <span className="schedule-spinner" aria-hidden="true" />
                                와이퍼 작동 중입니다 (약 {state.duration ?? 30}초)...
                            </p>
                        )}
                        {result && (
                            <p className={`control-confirm-status${result.ok ? "" : " schedule-warn"}`}>{result.message}</p>
                        )}
                        {result?.warnings?.map((text) => (
                            <p key={text} className="control-confirm-subtext">⚠ {text}</p>
                        ))}

                        <div className="control-confirm-actions schedule-actions">
                            <button className="hist-close-btn" onClick={onClose} disabled={busy}>닫기</button>
                            <button className="admin-btn" onClick={runNow}
                                disabled={busy || state.running || !state.has_script || (!isLegacy && !state.enabled)}>
                                {phase === "running"
                                    ? <><span className="schedule-spinner small" aria-hidden="true" /> 작동 중</>
                                    : "지금 한 번 작동"}
                            </button>
                            <button className="admin-btn primary" onClick={save} disabled={busy || !editable || unchanged}>
                                {phase === "saving"
                                    ? <><span className="schedule-spinner small" aria-hidden="true" /> 저장 중</>
                                    : "저장"}
                            </button>
                        </div>
                        {!isLegacy && !state.enabled && (
                            <p className="control-confirm-subtext">현행 모듈은 사용을 켜야 수동 작동도 됩니다.</p>
                        )}
                    </>
                )}

                {actions.length > 0 && (
                    <div className="schedule-history">
                        <span className="schedule-history-title">웹 변경·작동 기록</span>
                        <ul>
                            {actions.slice(0, 5).map((a) => (
                                <li key={a.id}>
                                    <span className="schedule-history-head">
                                        <span>{a.created_at?.slice(5, 16)} · {a.action === "run" ? "한 번 작동" : "설정 변경"}</span>
                                        <span className={`schedule-badge ${a.status === "failed" ? "failed" : ""}`}>
                                            {WIPER_ACTION_LABELS[a.status] ?? a.status}
                                        </span>
                                    </span>
                                    {a.message && <span className="schedule-history-msg">{a.message}</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {loadError && (
                    <div className="control-confirm-actions">
                        <button className="hist-close-btn" onClick={onClose}>닫기</button>
                    </div>
                )}
            </div>
        </div>
    );
}
