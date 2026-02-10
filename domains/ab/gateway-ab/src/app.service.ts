import { /*Inject,*/ Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';
import { ConsulDiscoveryService } from '@shared/consul/dist/consul-discovery.service';

@Injectable()
export class AppService {
  // constructor
  // with ClientProxy injection (SERVICE_A_CLIENT and SERVICE_B_CLIENT)
  // constructor(
  //   @Inject('SERVICE_A_CLIENT') private readonly serviceAClient: ClientProxy,
  //   @Inject('SERVICE_B_CLIENT') private readonly serviceBClient: ClientProxy,
  // ) {}

  private serviceAClient: ClientProxy;
  private serviceBClient: ClientProxy;

  constructor(private consulDiscovery: ConsulDiscoveryService) {}

  async onModuleInit() {
    console.log('⏳ [Gateway AB - HTTP] Waiting for services to register...');

    // Retry logic for service discovery (handle race conditions)
    const serviceAUrl = await this.discoverServiceWithRetry('service-a');
    const [hostA, portA] = this.parseUrl(serviceAUrl);

    this.serviceAClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: hostA, port: portA },
    });

    const serviceBUrl = await this.discoverServiceWithRetry('service-b');
    const [hostB, portB] = this.parseUrl(serviceBUrl);

    this.serviceBClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: hostB, port: portB },
    });

    console.log('✅ [Gateway AB - HTTP] Dynamic service discovery completed');
  }

  private async discoverServiceWithRetry(
    serviceName: string,
    maxRetries = 10,
    delayMs = 1000,
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.consulDiscovery.getServiceUrl(serviceName);
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        console.log(
          `⏳ [Gateway AB - HTTP] Service ${serviceName} not ready, retrying... (${i + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(
      `Failed to discover ${serviceName} after ${maxRetries} retries`,
    );
  }

  private parseUrl(url: string): [string, number] {
    const urlObj = new URL(url);
    // return [urlObj.hostname, parseInt(urlObj.port, 10)];
    return ['localhost', parseInt(urlObj.port, 10)];
  }

  async getHello(): Promise<string> {
    // I am waiting for service A and service B responses with await
    const responseA = await this.serviceAClient
      .send<string>({ cmd: 'hello-a' }, {})
      .toPromise(); // TODO: update to lastValueFrom in RxJS 7+
    const responseB = await this.serviceBClient
      .send<string>({ cmd: 'hello-b' }, {})
      .toPromise(); // TODO: update to lastValueFrom in RxJS 7+
    return `Service A says: ${responseA}, Service B says: ${responseB}`;
  }
}
