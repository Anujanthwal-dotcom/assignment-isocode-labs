import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './cart.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customer Cart')
@ApiBearerAuth()
@Roles(UserRole.CUSTOMER)
@Controller('customer/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current customer cart with real-time MRP calculations' })
  @ApiResponse({ status: 200, description: 'Current customer cart' })
  async getCart(@CurrentUser('id') customerUserId: string) {
    return this.cartService.getCart(customerUserId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add active medicine to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 400, description: 'Inactive medicine or invalid quantity' })
  async addItem(@CurrentUser('id') customerUserId: string, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(customerUserId, dto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateItem(
    @CurrentUser('id') customerUserId: string,
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(customerUserId, itemId, dto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeItem(@CurrentUser('id') customerUserId: string, @Param('id') itemId: string) {
    return this.cartService.removeItem(customerUserId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from customer cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@CurrentUser('id') customerUserId: string) {
    return this.cartService.clearCart(customerUserId);
  }
}
