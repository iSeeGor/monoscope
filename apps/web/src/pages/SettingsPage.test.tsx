import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SettingsPage from './SettingsPage'

afterEach(cleanup)

describe('SettingsPage', () => {
  it('shows the active theme and lets the user switch it', async () => {
    const setTheme = vi.fn()
    const user = userEvent.setup()
    render(<SettingsPage theme="dark" setTheme={setTheme} />)

    expect(screen.getByRole('button', { name: 'Темна' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Світла' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Світла' }))
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
