import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { AppDnsService } from './app-dns.service';

@Controller()
export class AppController {
  private readonly discoveryMode: string;

  constructor(
    private readonly appService: AppService,
    private readonly appDnsService: AppDnsService,
  ) {
    this.discoveryMode = process.env.CONSUL_DISCOVERY_MODE || 'http';
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'gateway-ab',
      discoveryMode: this.discoveryMode,
    };
  }

  @Get('hello') // HTTP GET endpoint /hello - uses configured discovery mode
  async getHello(): Promise<string> {
    if (this.discoveryMode === 'dns') {
      return await this.appDnsService.getHello();
    }
    return await this.appService.getHello();
  }

  @Get('hello-http') // HTTP GET endpoint /hello-http - explicitly use HTTP API discovery
  async getHelloHttp(): Promise<string> {
    return await this.appService.getHello();
  }

  @Get('hello-dns') // HTTP GET endpoint /hello-dns - explicitly use DNS-based discovery
  async getHelloDns(): Promise<string> {
    return await this.appDnsService.getHello();
  }
}
