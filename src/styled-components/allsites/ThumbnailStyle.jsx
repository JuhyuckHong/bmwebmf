import styled from 'styled-components';

const ThumbnailStyle = styled.div`
    --thumb-scale: calc(var(--site-info-width) / 350);
    --thumb-scale-clamped: clamp(0.6, var(--thumb-scale), 1.6);
    width: var(--site-info-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--surface-alt-color);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    color: var(--text-color);
    box-shadow: var(--shadow-soft);
    transition: background-color 0.25s ease, border-color 0.25s ease,
        box-shadow 0.25s ease;

    .thumb-wrapper {
        position: relative;
        width: 100%;
        min-height: 220px;
        background: linear-gradient(
            135deg,
            var(--surface-alt-color) 0%,
            var(--border-color) 100%
        );
        border-radius: 10px 10px 0 0;
        overflow: hidden;
    }

    .thumb-wrapper img {
        width: 100%;
        height: auto;
        border-radius: 10px 10px 0 0;
        transition: transform 0.1s ease-in-out;
        cursor: pointer;

        &:hover {
            transform: scaleX(1.015) scaleY(1.015);
            border-radius: 10px 10px 0px 0px;
        }
    }

    .thumb-overlay {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        color: #fff;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.6) 100%
        );
        border-radius: 0 0 10px 10px;
        pointer-events: none;
        gap: 8px;
    }

    .overlay-site {
        font-weight: 800;
        font-size: calc(0.9rem + 0.4rem * var(--thumb-scale-clamped));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .overlay-device {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 4px 8px;
        font-size: calc(0.85rem + 0.3rem * var(--thumb-scale-clamped));
        font-weight: 700;
    }

    .thumb-top-overlay {
        display: none;
    }

    .overlay-top-row {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        color: #fff;
        background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.65) 0%,
            rgba(0, 0, 0, 0.0) 100%
        );
        border-radius: 10px 10px 0 0;
        pointer-events: none;
    }

    .overlay-bottom {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding: 10px 12px;
        color: #fff;
        background: linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.65) 0%,
            rgba(0, 0, 0, 0.0) 100%
        );
        border-radius: 0 0 10px 10px;
        gap: 12px;
        pointer-events: none;
        font-size: calc(0.6rem + 0.6rem * var(--thumb-scale-clamped));
    }

    .bottom-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .bottom-line {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        color: #fff;
        font-size: calc(0.55rem + 0.45rem * var(--thumb-scale-clamped));
    }

    .overlay-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .overlay-right {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: flex-end;
    }

    .time-interval {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .recent-text {
        color: rgba(255, 255, 255, 0.85);
        font-size: calc(0.55rem + 0.45rem * var(--thumb-scale-clamped));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .upload-plan {
        font-weight: 800;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(0, 0, 0, 0.2);
        white-space: nowrap;
        font-size: calc(0.7rem + 0.5rem * var(--thumb-scale-clamped));
    }

    .remote-dot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255, 255, 255, 0.35);
        box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.18);
        background: transparent;
        font-size: 12px;
        line-height: 1;
        aspect-ratio: 1 / 1;
    }

    .remote-dot.on {
        background: transparent;
        border-color: transparent;
        box-shadow: none;
        width: 22px;
        height: 22px;
        background-image: url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2048%2048%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%0A%3Cpath%20d%3D%22M8%2018C16%2010%2032%2010%2040%2018%22%20stroke%3D%22%2322c55e%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Cpath%20d%3D%22M12%2023C18%2017%2030%2017%2036%2023%22%20stroke%3D%22%2322c55e%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Cpath%20d%3D%22M16%2028C20%2024%2028%2024%2032%2028%22%20stroke%3D%22%2322c55e%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Ccircle%20cx%3D%2224%22%20cy%3D%2234%22%20r%3D%223%22%20fill%3D%22%2322c55e%22/%3E%0A%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
    }

    .remote-dot.off {
        background: transparent;
        border-color: transparent;
        box-shadow: none;
        font-size: 16px;
        width: 22px;
        height: 22px;
        color: #ef4444;
        background-image: url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2048%2048%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%0A%3Cpath%20d%3D%22M8%2018C16%2010%2032%2010%2040%2018%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Cpath%20d%3D%22M12%2023C18%2017%2030%2017%2036%2023%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Cpath%20d%3D%22M16%2028C20%2024%2028%2024%2032%2028%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3Ccircle%20cx%3D%2224%22%20cy%3D%2234%22%20r%3D%223%22%20fill%3D%22%23ef4444%22/%3E%0A%3Cpath%20d%3D%22M30%2026l12%2012M42%2026l-12%2012%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22/%3E%0A%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
    }

    .remote-dot.unknown {
        background: #94a3b8;
        box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.18),
            0 0 0 6px rgba(148, 163, 184, 0.24);
    }

    .remote-inline {
        display: inline-flex;
        align-items: center;
        gap: 0px;
    }

    .site-information {
        width: 100%;
        margin-top: 5px;
        margin-bottom: 5px;
        border-radius: 0px 0px 10px 10px;
        background-color: var(--surface-color);
        border-top: 1px solid var(--border-color);
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: clamp(0.9rem, calc(var(--site-info-width) / 24), 1.1rem);
    }

    .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        color: var(--muted-text-color);
    }

    .meta-label {
        font-weight: 700;
        color: var(--text-color);
    }

    .meta-value {
        text-align: right;
        color: var(--muted-text-color);
    }

    .stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }

    .stat-card {
        background: var(--surface-alt-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .stat-label {
        color: var(--muted-text-color);
        font-size: 0.85em;
    }

    .stat-value {
        color: var(--text-color);
        font-weight: 800;
        font-size: 1.05em;
    }

    .time-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--surface-alt-color);
        border: 1px solid var(--border-color);
        font-weight: 700;
        color: var(--text-color);
        white-space: nowrap;
    }

    .time-row.single-line {
        justify-content: space-between;
    }

    .chip-text {
        font-size: 0.95rem;
    }

    .chip-sep,
    .chip-divider {
        color: var(--muted-text-color);
        font-weight: 600;
        line-height: 1;
        opacity: 0.7;
    }

    .overlay-bottom .chip-text:not(.chip-missing) {
        background: rgba(0, 0, 0, 0.35);
        padding: 4px 8px;
        border-radius: 8px;
        color: #f8fafc;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }

    .chip-missing {
        padding: 2px 6px;
        border-radius: 6px;
        color: #f8fafc;
    }

    .chip-text.missing-low {
        background: rgba(34, 197, 94, 0.32);
        color: #f8fafc;
    }

    .chip-text.missing-mid {
        background: rgba(249, 115, 22, 0.32);
        color: #f8fafc;
    }

    .chip-text.missing-high {
        background: rgba(239, 68, 68, 0.35);
        color: #f8fafc;
    }

    .chip-text.missing-unknown {
        background: rgba(148, 163, 184, 0.32);
        color: #f8fafc;
    }

    .status-row {
        display: none;
    }

    .thumbnails-individual.non-operational {
        filter: grayscale(70%);
        opacity: 0.7;
    }

    @media (max-width: 750px) {
        width: 95%;
        max-width: 95%;
        min-width: min(350px, 95%);
    }
`

export default ThumbnailStyle
