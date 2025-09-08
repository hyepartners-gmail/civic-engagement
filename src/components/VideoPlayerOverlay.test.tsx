import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VideoPlayerOverlay from './VideoPlayerOverlay';
import { useToast } from '@/hooks/use-toast';

// Mock useToast hook
let mockToastFn: jest.Mock;
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: (...args: any[]) => mockToastFn(...args),
  }),
}));

describe('VideoPlayerOverlay', () => {
  const mockVideoUrl = 'https://example.com/test-video.mp4';
  const mockOnClose = jest.fn();
  const mockOnVideoEnded = jest.fn();

  // Mock HTMLMediaElement.prototype.play and .pause
  let playSpy: jest.SpyInstance;
  let pauseSpy: jest.SpyInstance;
  let loadSpy: jest.SpyInstance;

  beforeAll(() => {
    // Mock video methods
    playSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    loadSpy = jest.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  });

  beforeEach(() => {
    mockToastFn = jest.fn();
    jest.clearAllMocks();
    playSpy.mockClear();
    pauseSpy.mockClear();
    loadSpy.mockClear();
  });

  afterAll(() => {
    playSpy.mockRestore();
    pauseSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('does not render when isOpen is false', () => {
    render(
      <VideoPlayerOverlay
        isOpen={false}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Close video')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true and attempts to autoplay', async () => {
    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    expect(screen.getByLabelText('Close video')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimize video')).toBeInTheDocument();
    const videoElement = screen.getByTestId('video-player') as HTMLVideoElement; // Use data-testid for video
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', mockVideoUrl);
    expect(videoElement).toHaveAttribute('autoplay');
    expect(videoElement).toHaveAttribute('playsinline');
    expect(videoElement).toHaveAttribute('muted');

    await waitFor(() => {
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(playSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onClose when the close button is clicked', async () => {
    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    fireEvent.click(screen.getByLabelText('Close video'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the minimize button is clicked', async () => {
    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    fireEvent.click(screen.getByLabelText('Minimize video'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('calls onVideoEnded when the video finishes playing', async () => {
    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    const videoElement = screen.getByTestId('video-player');
    fireEvent.ended(videoElement); // Simulate video ending

    expect(mockOnVideoEnded).toHaveBeenCalledTimes(1);
    expect(pauseSpy).toHaveBeenCalledTimes(1); // Should also pause on end
  });

  it('displays error message and toast if video fails to load/play', async () => {
    playSpy.mockImplementationOnce(() => Promise.reject(new Error('Autoplay failed')));

    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Adam's video is unavailable.")).toBeInTheDocument();
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Video Playback Error',
        description: 'Failed to autoplay video. Please try again or check the video URL.',
      }));
    });
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument(); // Video element should be gone
  });

  it('displays error message and toast if video element encounters an error', async () => {
    render(
      <VideoPlayerOverlay
        isOpen={true}
        videoUrl={mockVideoUrl}
        onClose={mockOnClose}
        onVideoEnded={mockOnVideoEnded}
      />
    );

    const videoElement = screen.getByTestId('video-player');
    fireEvent.error(videoElement); // Simulate video element error

    await waitFor(() => {
      expect(screen.getByText("Adam's video is unavailable.")).toBeInTheDocument();
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
        title: 'Video Loading Error',
        description: "Adam's video is currently unavailable. Please try again later.",
      }));
    });
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
  });
});