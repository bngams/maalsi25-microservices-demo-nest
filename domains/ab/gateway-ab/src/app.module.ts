import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppDnsService } from './app-dns.service';
// import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConsulModule } from '@shared/consul/dist/consul.module';

// Toggle between DNS and HTTP-based service discovery
// Set CONSUL_DISCOVERY_MODE=dns to use DNS-based discovery (for Docker/K8s)
// Set CONSUL_DISCOVERY_MODE=http (default) to use HTTP API-based discovery (for local dev)
const discoveryMode = process.env.CONSUL_DISCOVERY_MODE || 'http';

@Module({
  //imports: [
  //   ClientsModule.register([
  //     {
  //       name: 'SERVICE_A_CLIENT',
  //       transport: Transport.TCP,
  //       options: {
  //         host: 'localhost',
  //         port: 3001,
  //       },
  //     },
  //     {
  //       name: 'SERVICE_B_CLIENT',
  //       transport: Transport.TCP,
  //       options: {
  //         host: 'localhost',
  //         port: 3002,
  //       },
  //     },
  //   ]),
  // ],
  imports: [
    ConsulModule.register({
      serviceName: 'gateway-ab',
      servicePort: 3000,
      consulHost: 'localhost',
      consulPort: '8500',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AppDnsService],
})
export class AppModule {
  constructor() {
    console.log(
      `🔍 [Gateway AB] Using ${discoveryMode.toUpperCase()} service discovery mode`,
    );
  }
}
