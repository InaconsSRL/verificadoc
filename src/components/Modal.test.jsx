import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal'

const onClose = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Modal accesible', () => {
  it('renders as a dialog with accessible name and content', () => {
    render(
      <Modal title="Título visible" ariaLabel="Diálogo de prueba" onClose={onClose}>
        <p>Contenido</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog', { name: 'Diálogo de prueba' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('Contenido')).not.toBeNull()
  })

  it('closes with the Escape key', () => {
    render(
      <Modal title="T" ariaLabel="D" onClose={onClose}>
        <button type="button">Acción</button>
      </Modal>
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the backdrop but not the panel', () => {
    const { container } = render(
      <Modal title="T" ariaLabel="D" onClose={onClose}>
        <p>Contenido</p>
      </Modal>
    )

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('.modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has a labelled close button and moves focus into the dialog on open', () => {
    render(
      <Modal title="T" ariaLabel="D" onClose={onClose}>
        <p>Contenido</p>
      </Modal>
    )

    expect(screen.getByRole('button', { name: 'Cerrar' })).not.toBeNull()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })
})
