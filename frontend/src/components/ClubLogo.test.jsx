import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ClubLogo from './ClubLogo'

const withLogo = { name: 'Robotics Club', logoUrl: 'https://example.com/a.png' }

describe('ClubLogo', () => {
  it('renders the image when a logo URL is set', () => {
    render(<ClubLogo club={withLogo} />)
    expect(screen.getByRole('img', { name: 'Robotics Club logo' })).toHaveAttribute('src', withLogo.logoUrl)
  })

  it('shows initials from the first two words when there is no logo', () => {
    const { rerender } = render(<ClubLogo club={{ name: 'Robotics Club', logoUrl: '' }} />)
    expect(screen.getByText('RC')).toBeInTheDocument()
    rerender(<ClubLogo club={{ name: 'The Robotics Club', logoUrl: '' }} />)
    expect(screen.getByText('TR')).toBeInTheDocument()
  })

  it('falls back to initials when the image fails to load', () => {
    render(<ClubLogo club={withLogo} />)
    fireEvent.error(screen.getByRole('img', { name: 'Robotics Club logo' }))
    expect(screen.getByText('RC')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Robotics Club logo' })).not.toHaveAttribute('src')
  })

  it('gives a new URL a fresh attempt after a failure', () => {
    const { rerender } = render(<ClubLogo club={withLogo} />)
    fireEvent.error(screen.getByRole('img', { name: 'Robotics Club logo' }))
    rerender(<ClubLogo club={withLogo} />) // same broken URL stays on initials
    expect(screen.getByText('RC')).toBeInTheDocument()
    rerender(<ClubLogo club={{ ...withLogo, logoUrl: 'https://example.com/b.png' }} />)
    expect(screen.getByRole('img', { name: 'Robotics Club logo' })).toHaveAttribute('src', 'https://example.com/b.png')
  })
})