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

## How It Works

This project is mini IoC container.

When a class is decorated with `@Injectable()`, and the TypeScript compiler option `emitDecoratorMetadata` is turned on, TypeScript writes metadata onto that class describing the types of its constructor's parameters. This metadata is stored under the key `design:paramtypes`, and it holds the actual constructor functions used as parameter types (for example, `[Logger, Config]`).

The container reads this metadata using `Reflect.getMetadata('design:paramtypes', SomeClass)`. From this array, it knows exactly which classes are needed to build the requested one, and it constructs each of them recursively before finally constructing the class that was originally asked for.

There are two separate conditions that both have to be true for this metadata to exist at all:

1. `emitDecoratorMetadata` must be enabled in `tsconfig.json`. Without it, TypeScript never writes `design:paramtypes` that is why `Reflect.getMetadata('design:paramtypes', SomeClass)` returns undefined.
2. The class must have at least one decorator applied to it. If a class has no decorator at all, TypeScript will not emit any metadata for it, even when `emitDecoratorMetadata` is turned on.

For dependencies that are not classes — plain values, strings, or interfaces, which no longer exist once the code is compiled — the `@Inject(token)` decorator is used instead. It tells the container to find specific dependency by token (a `Symbol`) not by its type.
