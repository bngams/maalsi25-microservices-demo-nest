import { Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello') // HTTP GET endpoint /hello
  async getHello(): Promise<string> {
    return await this.appService.getHello();
  }

  @Post('clients/:id/generate-invoice')
  generateInvoice(@Param('id') clientId: string) {
    return this.appService.generateInvoice(clientId);
  }
}
