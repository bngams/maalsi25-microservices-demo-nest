/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Consul from 'consul';

@Injectable()
export class ConsulService implements OnModuleInit, OnModuleDestroy {
  private consul: Consul;
  private serviceId: string;

  constructor() {
    this.consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT || '8500', 10),
    });
  }

  async onModuleInit() {
    const serviceName = process.env.SERVICE_NAME || 'service-a';
    const servicePort = parseInt(process.env.SERVICE_PORT || '3001', 10);
    const serviceHost = process.env.SERVICE_HOST || 'host.docker.internal';

    this.serviceId = `${serviceName}-${servicePort}`;

    console.log(`📝 Registering service in Consul: ${this.serviceId}`);

    await this.consul.agent.service.register({
      id: this.serviceId,
      name: serviceName,
      address: serviceHost,
      port: servicePort,
      check: {
        name: `${serviceName}-health-check`,
        http: `http://${serviceHost}:${servicePort}/health`,
        interval: '10s', // Vérifier la santé toutes les 10 secondes
        timeout: '5s',
      },
    });
    console.log(`✅ Service registered successfully in Consul`);
  }

  async onModuleDestroy() {
    console.log(`📤 Deregistering service from Consul: ${this.serviceId}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.consul.agent.service.deregister(this.serviceId);
  }
}
