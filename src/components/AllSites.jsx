import { useState, useEffect } from 'react'
import cookie from "react-cookies"
import { API } from '../API' //이 부분은 실제 api 파일 경로로 바꿔주세요.

function AllSites({ token }) {
  const [thumbnails, setThumbnails] = useState([]);

  useEffect(() => {
    API.getThumbnails({ Authorization: cookie.load("authorization") })
      .then(res => {
        setThumbnails(res.data?.thumbnail_urls);
      })
      .catch(err => {
        console.error(err);
      });
  }, []); // dependency array는 빈 배열로 설정하여 컴포넌트가 마운트될 때만 호출되게 설정합니다.

  return (
    <div>
      {thumbnails.map((thumbnail, index) => (
        <img key={index} src={thumbnail} alt="thumbnail" />
      ))}
    </div>
  )
}

export default AllSites
