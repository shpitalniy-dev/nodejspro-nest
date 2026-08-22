## Getting Started

Start the app in development mode:

```bash
docker compose up
```

Run the test suite inside a container:

```bash
docker compose run --rm api npm test
```

Build and start the production image:

```bash
docker compose -f docker-compose.yml up -d --wait
```

## Shortcuts

A `Makefile` wraps the commands above:

```bash
make dev-build   # docker compose build
make dev-up      # docker compose up
make dev-down    # docker compose down
make prod-build  # docker compose -f docker-compose.yml build
make prod-up     # docker compose -f docker-compose.yml up -d
make prod-down   # docker compose -f docker-compose.yml down
make status      # docker compose ps
make test        # docker compose run --rm api npm test
```

## IoC | Part 1

When a class is decorated with `@Injectable()`, and the TypeScript compiler option `emitDecoratorMetadata` is turned on, TypeScript writes metadata onto that class describing the types of its constructor's parameters. This metadata is stored under the key `design:paramtypes`, and it holds the actual constructor functions used as parameter types (for example, `[Logger, Config]`).

The container reads this metadata using `Reflect.getMetadata('design:paramtypes', SomeClass)`. From this array, it knows exactly which classes are needed to build the requested one, and it constructs each of them recursively before finally constructing the class that was originally asked for.

There are two separate conditions that both have to be true for this metadata to exist at all:

1. `emitDecoratorMetadata` must be enabled in `tsconfig.json`. Without it, TypeScript never writes `design:paramtypes` that is why `Reflect.getMetadata('design:paramtypes', SomeClass)` returns undefined.
2. The class must have at least one decorator applied to it. If a class has no decorator at all, TypeScript will not emit any metadata for it, even when `emitDecoratorMetadata` is turned on.

For dependencies that are not classes — plain values, strings, or interfaces, which no longer exist once the code is compiled — the `@Inject(token)` decorator is used instead. It tells the container to find specific dependency by token (a `Symbol`) not by its type.

## HTTP | Part 2

### Parameter Decorator

`@Param(name)`, `@Query(name)`, and `@Body()` record metadata to class. TypeScript calls a parameter decorator as `(target, propertyKey, parameterIndex)`. Since these decorate a _method's_ parameters, `target` is the class prototype rather than the class itself, so the decorator reaches the real class through `target.constructor`. Instance methods like `getUser` only exist on `Users.prototype` — they are never properties of `Users` itself. `propertyKey` is the method name, and `parameterIndex` is that parameter's position in the method's argument list.

Each decorator call stores one entry — `{ index, type, name, dtoClass }` — in a map keyed by method name, saved as `METHOD_PARAMS` metadata on the controller class. `type` records which decorator was used (`param` / `query` / `body`), `name` is the key to pull out of that source (or none, for the whole object), and `dtoClass` is whatever type TypeScript resolved for that parameter, used later to run validation on `@Body()` arguments.

At request time, the `Dispatcher` looks up this list for the matched route's controller and method, then rebuilds the arguments array by `index`: for each entry it resolves the actual value from the matching source — `route.params` for `@Param`, the parsed query string for `@Query`, the parsed JSON body for `@Body` — and writes it into `args[index]`. Assembling the array by index, rather than by the order the decorators happened to run in, is what makes the result correct regardless of execution order: TypeScript evaluates parameter decorators right-to-left, so without the recorded index, values could land in the wrong argument slot.

## Lifecycle | Part 3

Every request passes through the same six stages, in the same order, on every route:

```
Request
   │
   ▼
Middleware          (RequestContext: reads/generates X-Request-Id, opens the ALS scope)
   │
   ▼
Guard               (canActivate → false stops here with 403, nothing below ever runs)
   │
   ▼
Interceptor:before ─┐
   │                │
   ▼                │  LoggingInterceptor wraps everything in the middle
Pipe                │  (GlobalZodValidationPipe.transform)
   │                │
   ▼                │
Handler             │  (the controller method itself)
   │                │
   ▼                │
Interceptor:after  ─┘
   │
   ▼
Response

   Anything thrown at any of the steps above
                  │
                  ▼
   GlobalExceptionFilter.catch → HTTP response (never an uncaught crash)
```

Guards and interceptors look similar but answer different questions. A guard only decides _whether_ the request proceeds at all — it runs once, before anything else, and can never see or touch the response. An interceptor wraps the call — it runs code both before and after `next()`, so it can time the handler, log its result, or short-circuit it entirely, which is exactly why `LoggingInterceptor` can measure duration and a guard structurally cannot.

### Why `AsyncLocalStorage`, not a global variable

A module-level variable like `let currentRequestId` doesn't work due to requests overlap. The handler for request A does some `await` — a DB call, `fetch`, anything asynchronous — and while it's suspended, the event loop is free to start handling request B, which promptly overwrites the same global with its own id. When A's `await` resolves and it finally logs `currentRequestId`, it reads B's id instead of its own. This isn't a rare edge case; it's the default outcome the moment a server handles more than one request concurrently.

`AsyncLocalStorage` solves this because the store isn't attached to a variable in module scope — it's attached to the _async execution context_ itself. `RequestContext.use()` calls `als.run({ requestId }, next)`, and everything that happens as a result of calling `next()` — every `await`, every nested async call — inherits that same context, correctly isolated from whatever other requests are concurrently running through the same code. That's what lets `UserService.getUserById`, two layers below the handler, read the right `requestId` through `this.requestContext.requestId` with no parameter carrying it there, and what the concurrent-request test in `test/lifecycle-order.test.ts` directly verifies by firing ten requests at once and confirming none of their ids cross over.
