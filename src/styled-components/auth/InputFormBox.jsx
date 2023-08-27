import styled from "styled-components"

const InputFormBox = styled.form`
    min-width: ${props => props.theme.box.width_min};
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    margin: ${props => props.theme.layout.space.default};
    gap: ${props => props.theme.layout.space.default};

    > input {
        height: 54px;
        width: 90%;
        font-size: clamp(1rem, 2vw, 1.2rem);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: ${props => props.theme.box.border_radius};
        box-shadow: ${props => props.theme.box.shadow};
        text-indent: ${props => props.theme.layout.space.xs};
        &:focus {
            border: none;
            outline: 2px solid ${props => props.theme.color.main[100]};
        }
    }
    > span {
        font-size: clamp(0.8rem, 1.8vw, 1.1rem);
        color: ${props => props.theme.color.highlight[600]};
        font-weight: bold;
    }
`

export default InputFormBox