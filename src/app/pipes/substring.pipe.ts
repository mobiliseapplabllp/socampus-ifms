import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'substring'
})
export class SubstringPipe implements PipeTransform {

  transform(str: any, len: any): any {
    if (str && str.length > len) {
      return (str.substring(0, len) + '.');
    } else {
      return str;
    }
  }

}
