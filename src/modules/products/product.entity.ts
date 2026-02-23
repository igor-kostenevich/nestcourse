import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('products')
@Index('idx_products_name', ['name'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('int')
  price: number;

  @Column('int')
  stock: number;
}
