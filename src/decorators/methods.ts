import 'reflect-metadata';

import { CONTROLLER_ROUTES } from '../tokens.ts';
import type { ControllerRouteItem, Ctor, HttpMethod } from '../types/index.ts';
import { httpMethods } from '../types/index.ts';

export const getControllerRoutes = (target: Ctor) =>
  Reflect.getMetadata(CONTROLLER_ROUTES, target) as
    | ControllerRouteItem[]
    | undefined;

export const getOwnControllerRoutes = (target: Ctor) =>
  Reflect.getOwnMetadata(CONTROLLER_ROUTES, target) as
    | ControllerRouteItem[]
    | undefined;

const methodDecoratorFactory =
  (method: HttpMethod) =>
  (path?: string): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    const ownRoutes = getOwnControllerRoutes(target.constructor as Ctor);
    const inheritedRoutes = getControllerRoutes(target.constructor as Ctor);

    const routes = ownRoutes ?? [...(inheritedRoutes ?? [])];
    routes.push({
      method,
      path,
      property: propertyKey,
    });

    Reflect.defineMetadata(CONTROLLER_ROUTES, routes, target.constructor);
  };

export const Get = methodDecoratorFactory(httpMethods.get);
export const Post = methodDecoratorFactory(httpMethods.post);
export const Put = methodDecoratorFactory(httpMethods.put);
export const Delete = methodDecoratorFactory(httpMethods.delete);
