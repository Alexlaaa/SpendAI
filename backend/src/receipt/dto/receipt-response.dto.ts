import { ApiProperty } from '@nestjs/swagger';

class ItemDto {
  @ApiProperty({ description: 'Name of the item', example: 'Item 1' })
  itemName: string;

  @ApiProperty({ description: 'Quantity of the item', example: 2 })
  itemQuantity: number;

  @ApiProperty({ description: 'Cost of the item', example: '10.00' })
  itemCost: number;
}

export class ReceiptResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the receipt',
    example: '650c59a88f1e78c88102d1a4',
  })
  id: string;

  @ApiProperty({ description: 'Merchant name', example: 'KFC' })
  merchantName: string;

  @ApiProperty({
    description: 'Date of the receipt, in String',
    example: '2024-09-01',
  })
  date: string;

  @ApiProperty({ description: 'Total cost', example: '19.99' })
  totalCost: number;

  @ApiProperty({ description: 'Category of the receipt', example: 'Food' })
  category: string;

  @ApiProperty({
    description: 'Itemized list of purchased items',
    type: [ItemDto],
  })
  itemizedList: ItemDto[];

  @ApiProperty({ description: 'User ID that owns this receipt' })
  userId: string;
}
