"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
  type CreateToasterReturn,
  type ToastOptions,
} from "@chakra-ui/react"

export type AppToastPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"

type ChakraToastPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"

const positionMap: Record<AppToastPosition, ChakraToastPlacement> = {
  top: "top",
  "top-left": "top-start",
  "top-right": "top-end",
  bottom: "bottom",
  "bottom-left": "bottom-start",
  "bottom-right": "bottom-end",
}

const positions = Object.keys(positionMap) as AppToastPosition[]

export const appToasters = Object.fromEntries(
  positions.map((position) => [
    position,
    createToaster({
      placement: positionMap[position],
      duration: 5_000,
      pauseOnPageIdle: true,
    }),
  ]),
) as Record<AppToastPosition, CreateToasterReturn>

// Keep the generated snippet's conventional export for callers that use the
// v3 store directly. The compatibility hook defaults to the same placement as
// Chakra v2: bottom.
export const toaster = appToasters.bottom

export function getAppToaster(position: AppToastPosition = "bottom") {
  return appToasters[position]
}

const renderToast = (toast: ToastOptions) => (
  <Toast.Root width={{ md: "sm" }}>
    {toast.type === "loading" ? (
      <Spinner size="sm" color="blue.solid" />
    ) : (
      <Toast.Indicator />
    )}
    <Stack gap="1" flex="1" maxWidth="100%">
      {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
      {toast.description && (
        <Toast.Description>{toast.description}</Toast.Description>
      )}
    </Stack>
    {toast.action && (
      <Toast.ActionTrigger>{toast.action.label}</Toast.ActionTrigger>
    )}
    {toast.closable && <Toast.CloseTrigger />}
  </Toast.Root>
)

export const Toaster = () => (
  <>
    {positions.map((position) => (
      <Portal key={position}>
        <ChakraToaster
          toaster={appToasters[position]}
          insetInline={{ mdDown: "4" }}
        >
          {renderToast}
        </ChakraToaster>
      </Portal>
    ))}
  </>
)
