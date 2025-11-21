import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices/client/client-proxy';

@Injectable()
export class AppService {
  // constructor
  // with ClientProxy injection (SERVICE_A_CLIENT and SERVICE_B_CLIENT)
  constructor(
    @Inject('SERVICE_A_CLIENT') private readonly serviceAClient: ClientProxy,
    @Inject('SERVICE_B_CLIENT') private readonly serviceBClient: ClientProxy,
    @Inject('CLIENTS_SERVICE') private readonly clientsService: ClientProxy,
  ) {}

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

  generateInvoice(clientId: string) {
    return this.clientsService.send({ cmd: 'generate_invoice' }, { clientId });
  }
}
