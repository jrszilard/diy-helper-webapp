'use client';

import { ExternalLink, Play, Clock, Eye } from 'lucide-react';

interface Video {
  title: string;
  description: string;
  url: string;
  thumbnail: string | null;
  duration: string | null;
  channel: string;
  views: string | null;
  published: string | null;
}

interface VideoResultsProps {
  videos: Video[];
  projectQuery: string;
}

export default function VideoResults({ videos, projectQuery }: VideoResultsProps) {
  if (videos.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
        <p className="text-yellow-800">
          No videos found for "{projectQuery}". Try searching with different keywords.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 my-4 border border-gray-200">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        <div className="bg-red-100 p-2 rounded-lg">
          <Play className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Video Tutorials</h3>
          <p className="text-sm text-gray-600">{projectQuery}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {videos.map((video, index) => {
          // Validate video URL — must start with https://
          if (!video.url || !video.url.startsWith('https://')) return null;
          // Validate thumbnail — use null for invalid URLs
          const safeThumbnail = video.thumbnail?.startsWith('https://') ? video.thumbnail : null;

          return (
          <a
            key={index}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-48 h-28 bg-gray-200 rounded-lg overflow-hidden relative">
              {safeThumbnail ? (
                <img
                  src={safeThumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if thumbnail fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-red-600 rounded-full p-3">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
              
              {video.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-90 text-white text-xs px-2 py-1 rounded font-semibold">
                  {video.duration}
                </div>
              )}
            </div>
            
            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1 line-clamp-2 leading-snug">
                {video.title}
              </h4>
              
              <div className="text-sm text-gray-600 mb-2 font-medium">
                {video.channel}
              </div>
              
              <p className="text-sm text-gray-700 line-clamp-2 mb-3 leading-relaxed">
                {video.description}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {video.views && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {video.views}
                  </span>
                )}
                
                {video.published && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {video.published}
                  </span>
                )}
                
                <span className="flex items-center gap-1 text-blue-600 font-medium group-hover:underline ml-auto">
                  Watch Video
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
          );
        })}
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Pro Tip:</p>
            <p>Watch 2-3 different tutorials to see various techniques and approaches. This helps you understand the full process and common pitfalls before starting your project.</p>
          </div>
        </div>
      </div>
    </div>
  );
}