import { renderHook, act } from '@testing-library/react';
import { CrosshairProvider } from '@/contexts/CrosshairContext';
import { useCrosshairBus } from '@/hooks/useCrosshairBus';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CrosshairProvider>{children}</CrosshairProvider>
);

describe('useCrosshairBus', () => {
  it('should provide initial state', () => {
    const { result } = renderHook(() => useCrosshairBus(), { wrapper });
    
    expect(result.current.hoveredYear).toBeNull();
  });

  it('should update hovered year', () => {
    const { result } = renderHook(() => useCrosshairBus(), { wrapper });
    
    act(() => {
      result.current.setHoveredYear(2020);
    });
    
    expect(result.current.hoveredYear).toBe(2020);
  });

  it('should clear hovered year', () => {
    const { result } = renderHook(() => useCrosshairBus(), { wrapper });
    
    act(() => {
      result.current.setHoveredYear(2020);
    });
    
    expect(result.current.hoveredYear).toBe(2020);
    
    act(() => {
      result.current.setHoveredYear(null);
    });
    
    expect(result.current.hoveredYear).toBeNull();
  });
});