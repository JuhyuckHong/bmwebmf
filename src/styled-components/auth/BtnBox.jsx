import styled from "styled-components"

const BtnBox = styled.div`
    width: 90%;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.layout.space.sm};
    margin-top: ${props => props.theme.layout.space.sm};

    > button {
        cursor: pointer;
        height: 48px;
        border: none;
        border-radius: ${props => props.theme.box.border_radius};
        flex: 1;
        background-color: ${props => props.theme.color.main[400]};
        color: white;
        font-size: clamp(1rem, 2vw, 1.2rem);
        transition: background-color 0.3s ease;
        &:hover {
            background-color: ${props => props.theme.color.main[200]};
        }
        &:disabled {
            cursor: not-allowed;
            background-color: rgba(0, 0, 0, 0.1);
        }
    }
`

export default BtnBox