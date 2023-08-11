import SelectPhoto from "./SelectPhoto";
import SelectedVideo from "./SelectedVideo";

function SingleSite({ site, setSite }) {
    const handleGoToMainPage = () => setSite(null);

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
            <SelectPhoto site={site} />
            <SelectedVideo site={site} />
        </div>
    );
}

export default SingleSite;
