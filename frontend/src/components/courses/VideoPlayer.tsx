'use client'

import React, { useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'

interface VideoPlayerProps {
  url: string // The secure Signed URL or HLS .m3u8 master playlist
  title?: string
  poster?: string // Video thumbnail
  isLive?: boolean
}

export default function VideoPlayer({ url, title, poster, isLive = false }: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Basic DOM-level DRM: Prevent context menu to deter simple downloads
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault() }
    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [])

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
      
      {/* Title Overlay overlay - deter screen recording by burning in user identifier (Conceptual) */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <h2 className="text-white text-lg font-semibold drop-shadow-md">
          {title || 'SCS Secure Stream'}
        </h2>
        <p className="text-white/50 text-xs">Protected Content</p>
      </div>

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={isPlaying}
        controls={true}
        light={poster ? poster : false} // Shows poster before playing
        onReady={() => setIsReady(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        config={{
          file: {
            attributes: {
              controlsList: 'nodownload', // Prevent native download button
              disablePictureInPicture: true,
            },
            // For HLS .m3u8 streams, react-player injects hls.js natively
            forceHLS: url.includes('.m3u8')
          }
        }}
        className="react-player"
      />
    </div>
  )
}
