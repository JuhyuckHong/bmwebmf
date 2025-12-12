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

const BtnBox = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    animation: ${fadeInUp} 0.6s ease-out 0.4s backwards;

    > button {
        cursor: pointer;
        height: 52px;
        width: 100%;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        transition: all 0.2s ease;

        &.Submit {
            background: #ea492e;
            color: white;
            box-shadow: 0 4px 15px rgba(234, 73, 46, 0.35);
            position: relative;
            overflow: hidden;

            &::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.2),
                    transparent
                );
                transition: left 0.5s ease;
            }

            &:hover {
                transform: translateY(-2px);
                background: #d4402a;
                box-shadow: 0 8px 25px rgba(234, 73, 46, 0.45);

                &::before {
                    left: 100%;
                }
            }

            &:active {
                transform: translateY(0);
            }
        }

        &.login-toggle {
            background: transparent;
            color: #6b7280;
            border: none;
            height: auto;
            padding: 0.75rem;
            font-weight: 500;
            font-size: 0.9rem;

            &:hover {
                color: #ea492e;
                background: transparent;
            }
        }

        &:disabled {
            cursor: not-allowed;
            background: #e5e7eb;
            color: #9ca3af;
            box-shadow: none;
            transform: none;
        }
    }
`

export default BtnBox