import React from 'react';

const VideoElement = ({ attributes, children, element }: any) => {
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop()
        : url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <div {...attributes} className="relative inline-block group my-4">
      <div className="relative">
        <iframe
          src={getEmbedUrl(element.url)}
          width={element.width}
          height={element.height}
          frameBorder="0"
          allowFullScreen
          className={`max-w-full border-2 border-transparent`}
          style={{ float: element.float }}
        />
      </div>
      {children}
    </div>
  );
};

export default VideoElement;
