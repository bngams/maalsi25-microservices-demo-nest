import { RmqContext } from '@nestjs/microservices';
export declare class AppController {
    handleInvoiceCreated(data: any, context: RmqContext): Promise<void>;
}
