import { Injectable } from '@nestjs/common';
import { User } from '@aims/datatypes';

@Injectable()
export class AppService {
  getData(): User {
    return { 
      id: '1',
      name: 'John Doe',
      email: 'abc@gmail.com'
     };
  }
}
