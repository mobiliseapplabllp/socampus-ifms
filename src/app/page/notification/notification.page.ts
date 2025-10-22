import { Component, OnInit } from '@angular/core';
import { LoginService } from 'src/app/provider/login/login.service';
import { CommonService } from 'src/app/provider/common/common.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.page.html',
  styleUrls: ['./notification.page.scss'],
})
export class NotificationPage implements OnInit {
  selectedSegment: string = 'all';
  allCount: number = 8;
  unreadCount: number = 8;
  alerts: any = [];
  allNotifications: any = [];

  constructor(
    private httpLogin: LoginService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.getNotificationList();
  }

  // getNotificationList() {
  //   this.common.presentLoading().then(preLoad => {
  //     const date = {date:'2025-10-10'};
  //   this.httpLogin.getNotification(date).subscribe({
  //     next: (data) => {
  //       console.log(data);
  //       this.alerts = data.data;
  //       console.log(this.alerts);
  //     },
  //     error: (err) => {
  //       this.common.dismissloading();
  //       alert('Something went wrong');
  //       console.log(err);
  //     },
  //     complete: () => {
  //       this.common.dismissloading();
  //       console.log('Notification request completed');
  //     }
  //   });
  // });
  getNotificationList() {
    this.common.presentLoading().then(preLoad => {
      const date = { date: '2025-10-10' };
      this.httpLogin.getNotification(date).subscribe({
        next: (data) => {
          console.log(data);
          this.allNotifications = data.data; // Store all data
          this.alerts = this.allNotifications.slice(0, 10); // Show first 10
          console.log(this.alerts);
        },
        error: (err) => {
          this.common.dismissloading();
          alert('Something went wrong');
          console.log(err);
        },
        complete: () => {
          this.common.dismissloading();
          console.log('Notification request completed');
        }
      });
    });


  }
  getButtonText(action: string): string {
    if (action === 'Create') return 'View Ticket';
    if (action === 'Assigned') return 'View Content';
    return '';
  }

  getHoursAgo(datetime: string): string {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years >= 1) {
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }

    if (months >= 1) {
      const remainingDays = days % 30;
      return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months}m`;
    }

    if (days >= 1) {
      const remainingHours = hours % 24;
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }

    if (hours >= 1) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    return `${minutes}mn`;
  }
  onIonInfinite(event: any) {
    const currentLength = this.alerts.length;
    const nextBatch = this.allNotifications.slice(currentLength, currentLength + 10);

    if (nextBatch.length > 0) {
      this.alerts = [...this.alerts, ...nextBatch];
    }

    setTimeout(() => {
      event.target.complete();

      // Disable if no more data
      if (this.alerts.length >= this.allNotifications.length) {
        event.target.disabled = true;
      }
    }, 500);
  }

}

