import { Injectable, NotFoundException } from '@nestjs/common';
import { UserResponseDto } from './dto/user-response.dto';

interface UserEntity {
  id: number;
  email: string;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users: UserEntity[] = [
    { id: 1, email: 'user1@example.com', name: 'User One' },
    { id: 2, email: 'user2@example.com', name: 'User Two' },
  ];

  findAll(): UserResponseDto[] {
    return this.users.map((user) => new UserResponseDto(user));
  }

  findOne(id: number): UserResponseDto {
    const user = this.users.find((u) => u.id === id);

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    return new UserResponseDto(user);
  }
}
