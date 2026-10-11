/**
 * Shared stack for modal dialogs.
 * Only the top-most open dialog handles Escape and Tab so nested
 * confirmation dialogs do not close or trap focus in their parent.
 */
const modalStack: symbol[] = []

export function registerModal(id: symbol): void {
  const currentIndex = modalStack.lastIndexOf(id)
  if (currentIndex >= 0) modalStack.splice(currentIndex, 1)
  modalStack.push(id)
}

export function unregisterModal(id: symbol): void {
  const index = modalStack.lastIndexOf(id)
  if (index >= 0) modalStack.splice(index, 1)
}

export function isTopModal(id: symbol): boolean {
  return modalStack.length > 0 && modalStack[modalStack.length - 1] === id
}
