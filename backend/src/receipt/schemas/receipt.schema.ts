import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Category } from '../receipt.enums';

// Define the Mongoose document type
export type ReceiptDocument = Receipt & Document;

@Schema()
export class Receipt {
  @ApiProperty({ description: 'Merchant name', example: 'KFC' })
  @Prop({ required: true })
  merchantName: string;

  @ApiProperty({ description: 'Date of the receipt', example: '2024-09-01' })
  @Prop({ type: Date, required: true })
  date: Date;

  @ApiProperty({ description: 'Total cost', example: '19.99' })
  @Prop({ required: true })
  totalCost: number;

  @ApiProperty({ description: 'Category of spending', example: 'Food' })
  @Prop({ required: true })
  category: Category;

  @ApiProperty({
    description: 'Itemized list of purchased items',
    example: '[{ item_name: "Item 1", item_quantity: 2, item_cost: "10.00" }]',
  })
  @Prop({
    type: [{ itemName: String, itemQuantity: Number, itemCost: Number }],
    _id: false, // Disable _id generation for subdocuments
  })
  itemizedList: Array<{
    itemName: string;
    itemQuantity: number;
    itemCost: number;
  }>;

  @ApiProperty({ description: 'User ID that owns this receipt' })
  @Prop({ required: true })
  userId: string; // Reference to the owning user
}

// Create and export the schema using SchemaFactory
export const ReceiptSchema = SchemaFactory.createForClass(Receipt);
