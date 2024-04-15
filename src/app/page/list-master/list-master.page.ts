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
  ionRefresh = false;
  isLoading!: boolean;
  constructor() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.userName = this.userData.user_name
    }
  }

  ngOnInit(): void {
    this.changeEvent();
  }

  changeEvent() {
    this.eventChange = true;
    this.isLoading = true;
    setTimeout(() => {
      this.eventChange = false;
      this.isLoading = false;
    }, 1500);
  }

  // ionViewDidEnter() {
  //   this.eventChange = true;
  //   setTimeout(() => {
  //     this.eventChange = false;
  //   }, 1500);
  // }

  handleRefresh(event: any) {
    event.target.complete();
    this.isLoading = true;
    this.changeEvent();
  }
}
