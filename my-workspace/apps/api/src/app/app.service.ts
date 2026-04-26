import { Injectable } from '@nestjs/common';
import { User } from '@my-workspace/datatypes';

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
