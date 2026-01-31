export class UserResponseDto {
  id: number;
  email: string;
  name: string;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
