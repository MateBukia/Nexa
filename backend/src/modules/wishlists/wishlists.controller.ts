import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistsService } from './wishlists.service';

@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistsController {
  constructor(private readonly wishlists: WishlistsService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlists.findMine(user.id);
  }

  @Post('items')
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddWishlistItemDto) {
    return this.wishlists.add(user.id, dto.productId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('items/:productId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlists.remove(user.id, productId);
  }
}
