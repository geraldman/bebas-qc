import { Route as rootRouteImport } from './routes/__root'
import { Route as RcaRouteImport } from './routes/rca'
import { Route as HistoryRouteImport } from './routes/history'
import { Route as DetectRouteImport } from './routes/detect'
import { Route as IndexRouteImport } from './routes/index'

const RcaRoute = RcaRouteImport.update({
  id: '/rca',
  path: '/rca',
  getParentRoute: () => rootRouteImport,
} as any)
const HistoryRoute = HistoryRouteImport.update({
  id: '/history',
  path: '/history',
  getParentRoute: () => rootRouteImport,
} as any)
const DetectRoute = DetectRouteImport.update({
  id: '/detect',
  path: '/detect',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/detect': typeof DetectRoute
  '/history': typeof HistoryRoute
  '/rca': typeof RcaRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/detect': typeof DetectRoute
  '/history': typeof HistoryRoute
  '/rca': typeof RcaRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/detect': typeof DetectRoute
  '/history': typeof HistoryRoute
  '/rca': typeof RcaRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/detect' | '/history' | '/rca'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/detect' | '/history' | '/rca'
  id: '__root__' | '/' | '/detect' | '/history' | '/rca'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  DetectRoute: typeof DetectRoute
  HistoryRoute: typeof HistoryRoute
  RcaRoute: typeof RcaRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/rca': {
      id: '/rca'
      path: '/rca'
      fullPath: '/rca'
      preLoaderRoute: typeof RcaRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/history': {
      id: '/history'
      path: '/history'
      fullPath: '/history'
      preLoaderRoute: typeof HistoryRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/detect': {
      id: '/detect'
      path: '/detect'
      fullPath: '/detect'
      preLoaderRoute: typeof DetectRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
  }
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  DetectRoute: DetectRoute,
  HistoryRoute: HistoryRoute,
  RcaRoute: RcaRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { createStart } from '@tanstack/react-start'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
