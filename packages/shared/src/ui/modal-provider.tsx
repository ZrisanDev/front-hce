"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

export type ModalContent =
  | React.ReactNode
  | ((close: () => void) => React.ReactNode)

export type ModalOptions = {
  title?: React.ReactNode
  description?: React.ReactNode
  content?: ModalContent
  footer?: ModalContent
  showCloseButton?: boolean
  className?: string
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
}

export type ModalContextValue = {
  isOpen: boolean
  openModal: (options: ModalOptions) => void
  closeModal: () => void
}

const ModalContext = React.createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ModalOptions | null>(null)
  const optionsRef = React.useRef<ModalOptions | null>(null)

  const closeModal = React.useCallback(() => {
    optionsRef.current?.onClose?.()
    optionsRef.current = null
    setOptions(null)
  }, [])

  const openModal = React.useCallback((opts: ModalOptions) => {
    optionsRef.current = opts
    setOptions(opts)
  }, [])

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      options?.onOpenChange?.(open)
      if (!open) closeModal()
    },
    [options, closeModal]
  )

  const value = React.useMemo<ModalContextValue>(
    () => ({ isOpen: options !== null, openModal, closeModal }),
    [options, openModal, closeModal]
  )

  return (
    <ModalContext.Provider value={value}>
      {children}
      {options && (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent
            showCloseButton={options.showCloseButton}
            className={options.className}
          >
            {(options.title || options.description) && (
              <DialogHeader>
                {options.title && <DialogTitle>{options.title}</DialogTitle>}
                {options.description && (
                  <DialogDescription>{options.description}</DialogDescription>
                )}
              </DialogHeader>
            )}
            {typeof options.content === "function"
              ? options.content(closeModal)
              : options.content}
            {options.footer && (
              <DialogFooter>
                {typeof options.footer === "function"
                  ? options.footer(closeModal)
                  : options.footer}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </ModalContext.Provider>
  )
}

export function useModal(): ModalContextValue {
  const ctx = React.useContext(ModalContext)
  if (!ctx) {
    throw new Error("useModal must be used within <ModalProvider>")
  }
  return ctx
}
