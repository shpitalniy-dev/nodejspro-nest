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
        if (segments[i].startsWith(':')) continue;
        if (segments[i] !== pathSegments[i]) return false;
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
