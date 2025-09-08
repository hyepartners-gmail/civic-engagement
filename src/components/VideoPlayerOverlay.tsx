"use client";

import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minimize2 } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface VideoPlayerOverlayProps {
  isOpen: boolean;
  videoUrl: string;
  onClose: () => void; // Called when video is closed (finished or minimized)
  onVideoEnded: () => void; // Specifically when video finishes
}

const VideoPlayerOverlay: React.FC<VideoPlayerOverlayProps> = ({
  isOpen,
  videoUrl,
  onClose,
  onVideoEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      setVideoError(false); // Reset error state when opening
      videoRef.current.load(); // Ensure video source is reloaded
      videoRef.current.play().catch(error => {
        console.error("Error attempting to autoplay video:", error);
        setVideoError(true);
        toast({
          variant: 'destructive',
          title: 'Video Playback Error',
          description: 'Failed to autoplay video. Please try again or check the video URL.',
        });
      });
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset video to start
    }
  }, [isOpen, videoUrl, toast]);

  const handleVideoEnded = () => {
    console.log("Video ended.");
    onVideoEnded();
  };

  const handleMinimize = () => {
    console.log("Video minimized.");
    onClose(); // onClose implies video interaction is complete for voting purposes
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video element error:", e);
    setVideoError(true);
    toast({
      variant: 'destructive',
      title: 'Video Loading Error',
      description: 'Adam\'s video is currently unavailable. Please try again later.',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="relative w-full h-full max-w-4xl max-h-[90vh] bg-platform-background rounded-lg shadow-2xl flex flex-col overflow-hidden"
            initial={{ scale: 0.9, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <div className="absolute top-6 right-6 flex gap-2 z-10"> {/* Adjusted top/right */}
              <Button
                variant="platform-ghost" // Using new platform variant
                size="sm"
                className="hover:text-white"
                onClick={handleMinimize}
                aria-label="Minimize video"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
              <Button
                variant="platform-ghost" // Using new platform variant
                size="sm"
                className="hover:text-white"
                onClick={onClose}
                aria-label="Close video"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {videoError ? (
              <div className="flex flex-1 items-center justify-center text-center text-platform-text/70 font-normal text-lg p-4">
                <p>Adam's video is unavailable.</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                // Mute by default to allow autoplay, user can unmute
                muted={true} 
                data-testid="video-player" // Added data-testid
                // Add a track for captions if available (example, needs actual VTT file)
                // <track kind="captions" src="/path/to/captions.vtt" srcLang="en" label="English" default />
              >
                Your browser does not support the video tag.
              </video>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoPlayerOverlay;