"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.createMicroservice(app_module_1.AppModule, {
        transport: microservices_1.Transport.RMQ,
        options: {
            urls: ['amqp://admin:admin@localhost:5672'],
            queue: 'invoices',
            queueOptions: {
                durable: true,
            },
            noAck: false,
        },
    });
    await app.listen();
    console.log('Service Orders is listening to RabbitMQ queue: invoices');
}
bootstrap();
//# sourceMappingURL=main.js.map