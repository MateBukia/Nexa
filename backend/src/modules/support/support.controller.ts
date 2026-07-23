import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { SupportService } from './support.service';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.support.create(user.id, dto);
  }

  @Get('me')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TicketQueryDto,
  ) {
    return this.support.findMine(user.id, query);
  }

  @Roles('admin', 'support_agent')
  @UseGuards(RolesGuard)
  @Get()
  findInbox(@Query() query: TicketQueryDto) {
    return this.support.findInbox(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.support.findOne(id, user);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.support.addMessage(id, user, dto);
  }

  @Roles('admin', 'support_agent')
  @UseGuards(RolesGuard)
  @Patch(':id/assign-self')
  assignToSelf(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.support.assignToSelf(id, user);
  }

  @Roles('admin', 'support_agent')
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.support.updateStatus(id, dto.status, user);
  }
}
