import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello') // HTTP GET endpoint /hello
  async getHello(): Promise<string> {
    return await this.appService.getHello();
  }
}
