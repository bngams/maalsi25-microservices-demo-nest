import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices/decorators/message-pattern.decorator'; // import without barrel here

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Get() => HTTP GET endpoint removed
  // Replaced with a message pattern for microservice communication
  @MessagePattern({ cmd: 'hello-b' })
  getHello(): string {
    return this.appService.getHello();
  }
}
