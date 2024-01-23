import { Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-list-master',
  templateUrl: './list-master.page.html',
  styleUrls: ['./list-master.page.scss'],
})
export class ListMasterPage implements OnInit {
  userData: any = [];
  userName!: string;
  eventChange = false;
  constructor() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit(): void { }

  ionViewDidEnter() {
    this.eventChange = true;
    setTimeout(() => {
      this.eventChange = false;
    }, 1500);
  }
}
