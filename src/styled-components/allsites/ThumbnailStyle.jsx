import styled from 'styled-components';

const ThumbnailStyle = styled.div`
    width: ${props => props.theme.site_info_width};
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* background-color: whitesmoke; */

    > img {
        width: 100%;
        height: auto;
        border-radius: 10px 10px 0 0;
        transition: transform 0.1s ease-in-out;
        cursor: pointer;
    }

    > .site-information {
        
    }
`

export default ThumbnailStyle