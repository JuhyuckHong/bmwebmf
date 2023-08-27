import styled from "styled-components"

const TitleBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 40vw;
    height: 20vh;
    min-width: ${props => props.theme.box.width_min};
    font-size: clamp(1rem, 2vw, 1.2rem);
    border-radius: ${props => props.theme.box.border_radius};
    background-color: white;
    /* box-shadow: ${props => props.theme.box.shadow}; */
    margin: ${props => props.theme.layout.space.default};

    > .ci {
        width: 300px;
        height: 250px;
        background-image: url("/buildMotion_ci.jpeg");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
    }
    > h2 {
        font-size: clamp(1.4rem, 2.2vw, 1.8rem);
        color: ${props => props.theme.color.main[600]};
        letter-spacing: ${props => props.theme.font.letter_space};
    }
`

export default TitleBox