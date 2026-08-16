import 'reflect-metadata';

import { getControllerPrefix } from './decorators/controller.ts';
import { Injectable } from './decorators/injectable.ts';
import { getControllerRoutes } from './decorators/methods.ts';
import type { Ctor, HttpMethod } from './types/index.ts';
import { buildSegments } from './utils/segments.ts';

type HandlerItem = {
  controller: Ctor;
  property: string | symbol;
  params: { [key: string]: string };
};

type RouteItem = {
  segments: string[];
  controller: Ctor;
  property: string | symbol;
};

@Injectable()
export class Router {
  // @ToDo: save routes by controller prefix to optimize search
  // @ToDo: what if prefix is just /
  private routes: Map<HttpMethod, RouteItem[]> = new Map();

  register(ctor: Ctor) {
    const ctorPrefix = getControllerPrefix(ctor);
    const ctorRoutes = getControllerRoutes(ctor);

    for (const ctorRoute of ctorRoutes) {
      const segments = buildSegments(ctorPrefix, ctorRoute.path);

      if (!this.routes.has(ctorRoute.method)) {
        this.routes.set(ctorRoute.method, []);
      }

      const route = this.routes.get(ctorRoute.method) as RouteItem[];
      route.push({
        segments,
        controller: ctor,
        property: ctorRoute.property,
      });
    }
  }

  match(path: string, method: HttpMethod): HandlerItem | null {
    const route = this.routes.get(method);

    if (!route) {
      return null;
    }

    const pathWithoutQuery = path.split('?')[0];
    const pathSegments = pathWithoutQuery.split('/').filter(Boolean);

    // @Note: return routes /user/me, /user/:id
    const matchedRoutes = route.filter(({ segments }) => {
      if (segments.length !== pathSegments.length) return false;

      for (let i = 0; i < segments.length; i++) {
        const routeSegment = segments[i];
        const pathSegment = pathSegments[i];
        if (routeSegment.startsWith(':')) continue;
        if (routeSegment !== pathSegment) return false;
      }

      return true;
    });

    if (!matchedRoutes.length) {
      return null;
    }

    // @Note: exact match first
    const matchedRoute =
      matchedRoutes.find(({ segments }) =>
        segments.every((s, inx) => s === pathSegments[inx]),
      ) ?? matchedRoutes[0];

    const params = matchedRoute.segments.reduce(
      (acc, s, inx) =>
        s.startsWith(':') ? { ...acc, [s.slice(1)]: pathSegments[inx] } : acc,
      {},
    );

    return {
      controller: matchedRoute.controller,
      property: matchedRoute.property,
      params,
    };
  }
}
