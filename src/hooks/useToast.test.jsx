import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, render, screen, act } from '@testing-library/react'
import { useToast, Toast } from '@/hooks/useToast'

// ── useToast hook ────────────────────────────────────────────

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('toast is null initially', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('toast appears when showToast is called', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.showToast('Document saved') })

    expect(result.current.toast).toEqual({ msg: 'Document saved', isError: false })
  })

  it('toast disappears after 4000ms', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.showToast('Hello') })
    expect(result.current.toast).not.toBeNull()

    act(() => { vi.advanceTimersByTime(4000) })

    expect(result.current.toast).toBeNull()
  })

  it('toast is still visible at 3999ms', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.showToast('Hello') })
    act(() => { vi.advanceTimersByTime(3999) })

    expect(result.current.toast).not.toBeNull()
  })

  it('second call immediately replaces the first message', () => {
    const { result } = renderHook(() => useToast())

    act(() => { result.current.showToast('First') })
    act(() => { result.current.showToast('Second') })

    expect(result.current.toast).toEqual({ msg: 'Second', isError: false })

    act(() => { vi.advanceTimersByTime(4000) })

    expect(result.current.toast).toBeNull()
  })

  it('isError defaults to false', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('ok') })
    expect(result.current.toast.isError).toBe(false)
  })

  it('isError is true when passed explicitly', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('fail', true) })
    expect(result.current.toast.isError).toBe(true)
  })
})

// ── Toast component ──────────────────────────────────────────

describe('Toast component', () => {
  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('success variant: renders message with success styling', () => {
    const { container } = render(<Toast toast={{ msg: 'Saved!', isError: false }} />)
    screen.getByText('Saved!')
    expect(container.querySelector('.toast-success')).not.toBeNull()
  })

  it('error variant: renders message with error styling', () => {
    const { container } = render(<Toast toast={{ msg: 'Failed!', isError: true }} />)
    screen.getByText('Failed!')
    expect(container.querySelector('.toast-error')).not.toBeNull()
  })
})
