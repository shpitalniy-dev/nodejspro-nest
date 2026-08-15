import 'reflect-metadata';

import { CONTROLLER_ROUTES } from '../tokens.ts';
import type { ControllerRouteItem, Ctor, HttpMethod } from '../types/index.ts';
import { httpMethods } from '../types/index.ts';

export const getControllerRoutes = (target: Ctor): ControllerRouteItem[] =>
  Reflect.getMetadata(CONTROLLER_ROUTES, target) ?? [];

const methodDecoratorFactory =
  (method: HttpMethod) =>
  (path?: string): MethodDecorator =>
  (target, propertyKey, _descriptor) => {
    const routes: ControllerRouteItem[] = getControllerRoutes(
      target.constructor as Ctor,
    );

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
