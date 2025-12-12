import styled, { keyframes } from "styled-components"

const fadeInUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`

const InputFormBox = styled.form`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 1rem;
    animation: ${fadeInUp} 0.6s ease-out 0.1s backwards;

    > input {
        height: 52px;
        width: 100%;
        font-size: 1rem;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        padding: 0 1rem;
        background: #f9fafb;
        transition: all 0.2s ease;
        box-sizing: border-box;

        &::placeholder {
            color: #9ca3af;
        }

        &:hover {
            border-color: #d1d5db;
        }

        &:focus {
            border-color: #ea492e;
            background: white;
            outline: none;
            box-shadow: 0 0 0 4px rgba(234, 73, 46, 0.15);
        }
    }
    > span {
        font-size: clamp(0.8rem, 1.8vw, 1rem);
        color: var(--color-highlight-600);
        font-weight: 600;
    }
`

export default InputFormBox
