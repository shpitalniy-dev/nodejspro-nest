import 'reflect-metadata';

import { RequestContext } from './context/request-context.ts';
import { Config } from './controllers/config/index.ts';
import { Health } from './controllers/health/index.ts';
import { Logger } from './controllers/logger/index.ts';
import { Users } from './controllers/users/index.ts';
import { GlobalExceptionFilter } from './filters/exception.filter.ts';
import { AuthGuard } from './guards/auth.guard.ts';
import { LoggingInterceptor } from './interceptors/logging.interceptor.ts';
import { UserService } from './services/user.service.ts';
import { Container } from './container.ts';
import { Dispatcher } from './dispatcher.ts';
import { Router } from './router.ts';
import { LOGGER_PREFIX } from './tokens.ts';

const APP_PREFIX = 'app';

const container = new Container();

container.bind(Container).to(container);
container.bind(LOGGER_PREFIX).to(APP_PREFIX);
container.bind(Config).toSelf();
container.bind(Logger).toSelf();
container.bind(Health).toSelf();
container.bind(Users).toSelf();
container.bind(UserService).toSelf();
container.bind(AuthGuard).toSelf();
container.bind(RequestContext).toSelf();
container.bind(LoggingInterceptor).toSelf();
container.bind(GlobalExceptionFilter).toSelf();
container.bind(Router).toSelf();
container.bind(Dispatcher).toSelf();

const router = container.get(Router);
router.register(Health);
router.register(Users);

const dispatcher = container.get(Dispatcher);
dispatcher.registerMiddleware(RequestContext);
dispatcher.bootstrap();
