import styled from 'styled-components';

const ThumbnailStyle = styled.div`
    width: var(--site-info-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: whitesmoke;

    > img {
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

    /* > .site-information {
        
    } */
`

export default ThumbnailStyle