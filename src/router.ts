import 'reflect-metadata';

import { getControllerPrefix } from './decorators/controller.ts';
import { Injectable } from './decorators/injectable.ts';
import { getControllerRoutes } from './decorators/methods.ts';
import type { Ctor, HttpMethod } from './types/index.ts';
import { buildFullPath } from './utils/index.ts';

type HandlerItem = { controller: Ctor; property: string | symbol };
type MethodRouteMap = Map<HttpMethod, HandlerItem>;
type PathRouteMap = Map<string, MethodRouteMap>;

@Injectable()
export class Router {
  private routes: PathRouteMap = new Map();

  register(ctor: Ctor) {
    const ctorPrefix = getControllerPrefix(ctor);
    const ctorRoutes = getControllerRoutes(ctor);

    for (const ctorRoute of ctorRoutes) {
      const fullPath = buildFullPath(ctorPrefix, ctorRoute.path);

      if (!this.routes.has(fullPath)) {
        this.routes.set(fullPath, new Map());
      }

      const route = this.routes.get(fullPath) as MethodRouteMap;
      route.set(ctorRoute.method, {
        controller: ctor,
        property: ctorRoute.property,
      });
    }
  }

  // @ToDo: handle dynamic segments in the path
  // @ToDo: handle query parameters in the path
  match(path: string, method: HttpMethod): HandlerItem | null {
    const route = this.routes.get(path);

    if (!route) {
      return null;
    }

    const handler = route.get(method);

    if (!handler) {
      return null;
    }

    return handler;
  }
}
