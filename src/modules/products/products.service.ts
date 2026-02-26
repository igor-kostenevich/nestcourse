import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(dto);
    return this.productRepository.save(product);
  }

  async findAll(
    offset = 0,
    limit = 10,
  ): Promise<{
    data: Product[];
    meta: { total: number; offset: number; limit: number };
  }> {
    const [data, total] = await this.productRepository.findAndCount({
      order: { name: 'ASC' },
      skip: offset,
      take: limit,
    });
    return {
      data,
      meta: { total, offset, limit },
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product not found`);

    return product;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    return this.productRepository.find({
      where: { id: In(ids) },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }
}
