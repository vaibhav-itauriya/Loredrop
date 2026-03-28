import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";

interface VideoPlayerContextType {
    playVideo: (youtubeIdOrUrl: string) => void;
    closeVideo: () => void;
    activeVideoId: string | null;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);

// Helper to extract YouTube ID
function extractYouTubeId(urlOrId: string): string | null {
    // If it's already an 11-char ID and contains no slashes/special domain chars, assume it's the ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
        return urlOrId;
    }

    // Try parsing as URL
    try {
        let urlString = urlOrId;
        if (!urlString.startsWith("http")) {
            urlString = "https://" + urlString;
        }
        const url = new URL(urlString);
        if (url.hostname.includes("youtube.com")) {
            return url.searchParams.get("v");
        } else if (url.hostname.includes("youtu.be")) {
            return url.pathname.slice(1);
        }
    } catch (e) {
        // Ignore invalid URLs
    }

    return null;
}

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

    const playVideo = useCallback((youtubeIdOrUrl: string) => {
        const id = extractYouTubeId(youtubeIdOrUrl);
        if (id) {
            setActiveVideoId(id);
        } else {
            console.warn("Invalid YouTube URL or ID provided to playVideo");
        }
    }, []);

    const closeVideo = useCallback(() => {
        setActiveVideoId(null);
    }, []);

    // Close when pressing Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && activeVideoId) {
                closeVideo();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeVideoId, closeVideo]);

    return (
        <VideoPlayerContext.Provider value={{ playVideo, closeVideo, activeVideoId }}>
            {children}

            {/* Floating Video Player */}
            {activeVideoId && (
                <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-background border shadow-2xl rounded-xl overflow-hidden flex flex-col w-[360px] sm:w-[480px]">
                        {/* Header/Drag handle area */}
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Now Playing
                            </span>
                            <button
                                onClick={closeVideo}
                                className="p-1 rounded-md hover:bg-muted text-foreground/60 hover:text-foreground transition-colors"
                                aria-label="Close video"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Video Iframe */}
                        <div className="relative pt-[56.25%] bg-black">
                            <iframe
                                className="absolute inset-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </div>
            )}
        </VideoPlayerContext.Provider>
    );
}

export function useVideoPlayer() {
    const context = useContext(VideoPlayerContext);
    if (context === undefined) {
        throw new Error("useVideoPlayer must be used within a VideoPlayerProvider");
    }
    return context;
}
