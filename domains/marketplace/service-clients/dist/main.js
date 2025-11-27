"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const microservices_1 = require("@nestjs/microservices");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.connectMicroservice({
        transport: microservices_1.Transport.TCP,
        options: {
            host: 'localhost',
            port: 3003,
        },
    });
    await app.startAllMicroservices();
    await app.listen(3003, '0.0.0.0');
    console.log('Service Clients is listening on port 3003');
}
bootstrap();
//# sourceMappingURL=main.js.map