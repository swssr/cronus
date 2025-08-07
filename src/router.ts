import { createRouter } from '@tanstack/react-router'

// Import all routes
import { routeTree } from './routeTree.gen'

// Create the router using the route tree
export const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
