import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCooldown } from './useCooldown'

describe('useCooldown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts down every second', () => {
    const { result } = renderHook(() => useCooldown())
    expect(result.current.active).toBe(false)
    act(() => result.current.start(3))
    expect(result.current.active).toBe(true)
    expect(result.current.secondsLeft).toBe(3)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.secondsLeft).toBe(2)
  })

  it('defaults to 60 seconds and unlocks at zero', () => {
    const { result } = renderHook(() => useCooldown())
    act(() => result.current.start())
    expect(result.current.secondsLeft).toBe(60)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.active).toBe(false)
  })
})