import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import IdeasChat from './IdeasChat'
import { api } from '../api/client'

vi.mock('../api/client', () => ({ api: { chatEventIdeas: vi.fn() } }))

const idle = () => ({ active: false, secondsLeft: 0, start: vi.fn() })
const setup = (cooldown = idle()) => {
  render(
    <MemoryRouter>
      <IdeasChat clubId="c1" cooldown={cooldown} onClose={() => {}} />
    </MemoryRouter>
  )
  return { cooldown, input: screen.getByPlaceholderText('Ask for changes...') }
}

beforeEach(() => api.chatEventIdeas.mockReset())

describe('IdeasChat', () => {
  it('starts the 60 second cooldown and restores the message on a 429', async () => {
    const user = userEvent.setup()
    api.chatEventIdeas.mockRejectedValueOnce(Object.assign(new Error('busy'), { status: 429 }))
    const { cooldown, input } = setup()
    await user.type(input, 'cheaper ideas')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(cooldown.start).toHaveBeenCalledWith(60))
    await waitFor(() => expect(input).toHaveValue('cheaper ideas'))
  })

  it('trims long assistant replies to 500 characters before sending', async () => {
    const user = userEvent.setup()
    api.chatEventIdeas
      .mockResolvedValueOnce({ reply: 'x'.repeat(900), ideas: [] })
      .mockResolvedValueOnce({ reply: 'ok', ideas: [] })
    const { input } = setup()
    await user.type(input, 'first')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await screen.findByText('x'.repeat(900))
    await waitFor(() => expect(input).toBeEnabled())
    await user.type(input, 'second')
    await user.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(api.chatEventIdeas).toHaveBeenCalledTimes(2))
    const payload = api.chatEventIdeas.mock.calls[1][1]
    expect(payload.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(payload[1].content).toHaveLength(500)
  })
})