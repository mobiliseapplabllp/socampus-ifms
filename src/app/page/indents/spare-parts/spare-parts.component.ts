import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-spare-parts',
  templateUrl: './spare-parts.component.html',
  styleUrls: ['./spare-parts.component.scss'],
})
export class SparePartsComponent  implements OnInit {
  all_data: any;
  req_indent: any;
  constructor(
    private activeRoute: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    // this.activeRoute.queryParams.subscribe((res: any) => {
    //   if (res?.data){
    //     this.all_data = JSON.parse(res['data']);      
    //     console.log(this.all_data);
    //     this.req_indent = this.all_data.data?.reqIndent;
    //     console.log(this.req_indent);
    //   }      
    // });
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.['data']) {
    this.all_data = navigation.extras.state['data'];
    console.log(this.all_data);
    this.req_indent = this.all_data.data?.reqIndent;
    console.log(this.req_indent);
    } else {
    console.warn('No data found in router state.');
    // Optional: fallback or error message
    }
  }

  crIndent() {
    this.router.navigate(['/indents/cr-indent'], {
      state: {
        data: this.all_data
      }
    });
  }

}
