"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const orders_service_1 = require("./orders/orders.service");
let AppController = class AppController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    async handleInvoiceCreated(data, context) {
        console.log('📨 Received invoice generation request:', data);
        const invoiceNumber = `INV-${Date.now()}`;
        const order = await this.ordersService.create({
            clientId: data.clientId,
            invoiceNumber,
            items: data.items || [],
            totalAmount: data.totalAmount || 0,
            status: 'completed',
        });
        console.log('✅ Invoice created:', order);
        console.log('📧 (Simulated) Email sent to client\n');
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        channel.ack(originalMsg);
    }
    async getOrdersByClient(clientId) {
        return this.ordersService.findByClientId(clientId);
    }
    async getAllOrders() {
        return this.ordersService.findAll();
    }
};
exports.AppController = AppController;
__decorate([
    (0, microservices_1.EventPattern)('invoice_created'),
    __param(0, (0, microservices_1.Payload)()),
    __param(1, (0, microservices_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, microservices_1.RmqContext]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "handleInvoiceCreated", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_orders_by_client' }),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getOrdersByClient", null);
__decorate([
    (0, microservices_1.MessagePattern)({ cmd: 'get_all_orders' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAllOrders", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], AppController);
//# sourceMappingURL=app.controller.js.map