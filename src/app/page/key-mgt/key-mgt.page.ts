import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-key-mgt',
  templateUrl: './key-mgt.page.html',
  styleUrls: ['./key-mgt.page.scss'],
})
export class KeyMgtPage implements OnInit {

  constructor(
    private router : Router,
  ) { }

  ngOnInit() {
  }

  openRoute(url: string) {
    this.router.navigateByUrl(url);
  }

 
}
