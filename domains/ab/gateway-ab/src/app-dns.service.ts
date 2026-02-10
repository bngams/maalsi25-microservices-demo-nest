import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';
import { Resolver } from 'dns';

@Injectable()
export class AppDnsService {
  private serviceAClient: ClientProxy;
  private serviceBClient: ClientProxy;
  private dnsResolver: Resolver;

  constructor() {
    // Configure DNS resolver to use Consul DNS on localhost:8600
    this.dnsResolver = new Resolver();
    this.dnsResolver.setServers(['127.0.0.1:8600']);
  }

  async onModuleInit() {
    console.log('⏳ [Gateway AB - DNS] Waiting for services to register...');

    // Resolve service-a via Consul DNS with retry
    const serviceAHost = await this.resolveServiceWithRetry(
      'service-a.service.consul',
    );
    this.serviceAClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: serviceAHost,
        port: 3001,
      },
    });

    // Resolve service-b via Consul DNS with retry
    const serviceBHost = await this.resolveServiceWithRetry(
      'service-b.service.consul',
    );
    this.serviceBClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: serviceBHost,
        port: 3002,
      },
    });

    console.log('✅ [Gateway AB - DNS] Using Consul DNS for service discovery');
  }

  private async resolveServiceWithRetry(
    serviceName: string,
    maxRetries = 10,
    delayMs = 1000,
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.resolveService(serviceName);
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        console.log(
          `⏳ [Gateway AB - DNS] Service ${serviceName} not ready, retrying... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(
      `Failed to resolve ${serviceName} after ${maxRetries} retries`,
    );
  }

  private async resolveService(serviceName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.dnsResolver.resolve4(serviceName, (err, addresses) => {
        if (err) {
          console.error(`Failed to resolve ${serviceName}:`, err);
          reject(err);
        } else {
          console.log(`Resolved ${serviceName} to ${addresses[0]}`);
          resolve(addresses[0]);
        }
      });
    });
  }

  async getHello(): Promise<string> {
    const responseA = await this.serviceAClient
      .send<string>({ cmd: 'hello-a' }, {})
      .toPromise();
    const responseB = await this.serviceBClient
      .send<string>({ cmd: 'hello-b' }, {})
      .toPromise();
    return `Service A says: ${responseA}, Service B says: ${responseB}`;
  }
}
