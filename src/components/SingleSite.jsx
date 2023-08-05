import { useEffect, useState } from "react";
import { API } from "../API";
import cookie from "react-cookies";

function SingleSite({ site, setSite }) {
    const handleGoToMainPage = () => setSite(null);
    // State variable for the image URL
    const [imageUrl, setImageUrl] = useState(null);
    useEffect(() => {
        // Function to get the most recent image and set the image URL
        const getAndSetRecentImage = async () => {
            try {
                // Get the image Blob from the API
                const response = await API.getRecent(
                    { Authorization: cookie.load("BM") },
                    site,
                ); // Replace {} with your headers

                // Create an object URL for the image Blob
                const url = URL.createObjectURL(response.data);

                // Set the image URL
                setImageUrl(url);
            } catch (error) {
                console.error("Failed to get recent image:", error);
            }
        };

        // Call the function when the component mounts and whenever the site prop changes
        getAndSetRecentImage();
    }, [site]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
            }}>
            <button onClick={handleGoToMainPage}>Go to Main Page</button>
            <h2>{site}</h2>
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt="Recent"
                    style={{
                        maxWidth: "100%",
                        maxHeight: "80vh",
                        objectFit: "contain",
                    }}
                />
            )}
        </div>
    );
}

export default SingleSite;
