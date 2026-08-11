import type { ToastOptions } from "@chakra-ui/react"

import {
  appToasters,
  getAppToaster,
  type AppToastPosition,
} from "./toaster"

export type AppToastId = string | number
export type AppToastStatus =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "loading"

export interface AppToastOptions
  extends Omit<ToastOptions, "closable" | "id" | "type"> {
  id?: AppToastId
  isClosable?: boolean
  position?: AppToastPosition
  status?: AppToastStatus
}

export interface AppToast {
  (options: AppToastOptions): string
  close: (id: AppToastId) => void
  closeAll: () => void
  isActive: (id: AppToastId) => boolean
  update: (id: AppToastId, options: AppToastOptions) => void
}

const normalizeOptions = ({
  id,
  isClosable,
  position: _position,
  status,
  ...options
}: AppToastOptions): ToastOptions => ({
  ...options,
  ...(id === undefined ? {} : { id: String(id) }),
  ...(isClosable === undefined ? {} : { closable: isClosable }),
  ...(status === undefined ? {} : { type: status }),
})

const createToast = (options: AppToastOptions) =>
  getAppToaster(options.position).create(normalizeOptions(options))

const close = (id: AppToastId) => {
  const normalizedId = String(id)
  Object.values(appToasters).forEach((store) => store.dismiss(normalizedId))
}

const closeAll = () => {
  Object.values(appToasters).forEach((store) => store.dismiss())
}

const isActive = (id: AppToastId) => {
  const normalizedId = String(id)
  return Object.values(appToasters).some((store) =>
    store.isVisible(normalizedId),
  )
}

const update = (id: AppToastId, options: AppToastOptions) => {
  const normalizedId = String(id)
  const store = Object.values(appToasters).find((candidate) =>
    candidate.isVisible(normalizedId),
  )

  store?.update(normalizedId, normalizeOptions(options))
}

const appToast: AppToast = Object.assign(createToast, {
  close,
  closeAll,
  isActive,
  update,
})

export function useAppToast(): AppToast {
  return appToast
}
