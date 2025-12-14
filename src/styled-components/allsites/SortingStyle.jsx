import styled from 'styled-components';

const SortingStyle = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;

    .control-group {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-alt-color);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md, 8px);
        padding: 6px 12px;
        height: 40px;
    }

    .control-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--muted-text-color);
        white-space: nowrap;
    }

    .control-value {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .control-btn {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 28px;
        min-width: 28px;
        padding: 4px 10px;
        border: none;
        border-radius: var(--radius-sm, 4px);
        background-color: var(--color-main-800);
        color: var(--color-highlight-50);
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;

        &:hover {
            background-color: var(--color-main-600);
        }

        &:active {
            transform: scale(0.96);
        }
    }

    .control-btn.small {
        min-width: 24px;
        padding: 4px 6px;
        font-size: 0.75rem;
    }

    .size-display {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-color);
        min-width: 50px;
        text-align: center;
    }

    @media (max-width: 1100px) {
        flex-direction: column;
        gap: 8px;
    }
`

export default SortingStyle
