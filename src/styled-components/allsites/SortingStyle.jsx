import styled from 'styled-components';

const SortingStyle = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    height: 44px;
    font-size: clamp(0.9rem, 2.5vw, 1.2rem);
    font-weight: normal;
    gap: 20px;

    .sorting {
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        white-space: pre;
    }

    .sorting > button {
        display: flex;
        justify-content: center;
        align-items: center;

        height: 30px;
        cursor: pointer;
        padding: 8px 10px;
        margin: 0 5px;
        border: none;
        border-radius: var(--radius-sm);
        background-color: var(--color-main-800);
        color: var(--color-highlight-50);
        font-size: clamp(0.8rem, 2.1vw, 1.0rem);
        font-weight: bold;

        transition: background-color 0.3s;

        &:hover {
            background-color: var(--color-main-500);
        }
    }
`

export default SortingStyle
