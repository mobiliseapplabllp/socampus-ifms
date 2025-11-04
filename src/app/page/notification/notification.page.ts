import { Component, OnInit } from '@angular/core';
import { LoginService } from 'src/app/provider/login/login.service';
import { CommonService } from 'src/app/provider/common/common.service';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';

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
  todayDate = moment().format('YYYY-MM-DD');
  page = 1;
  canLoadData = false;
  constructor(
    private httpLogin: LoginService,
    private common: CommonService
  ) { }

  ngOnInit() {    
    this.getNotificationList(false);
  }

  getNotificationList(isFromInfinite: boolean = false, event?: any) {
    const obj = {
      page: this.page,
      limit: 10,      
    }
    const loaderPromise = isFromInfinite ? Promise.resolve() : this.common.presentLoading();

    loaderPromise.then(preLoad => {
      this.httpLogin.getNotification(obj).subscribe({
        next: (data) => {
          console.log(data);
          if (data.status) {
            this.allNotifications = [...this.allNotifications, ...data.data.data];
            this.alerts = this.allNotifications;
            this.page = this.page + 1;
            this.canLoadData = true;
          } else {
            this.canLoadData = false;
            this.common.presentToast(data.msg, 'warning');
          }
        },
        error: (err) => {
          if (!isFromInfinite) {
            this.common.dismissloading();
          } else if(event){
            event.target.complete();
          }          
          this.common.presentToast(environment.errMsg, 'danger');
        },
        complete: () => {
          if (!isFromInfinite) {
            this.common.dismissloading();
          } else if(event){
            event.target.complete();
          }          
          this.common.dismissloading();
        }
      });
    });
  }

  onIonInfinite(event: any) {
    this.getNotificationList(true, event);
  }

  getButtonText(action: string): string {
    if (action === 'Create') return 'View Ticket';
    if (action === 'Assigned') return 'View Content';
    return '';
  }

  getTimeAgo(dateString: string): string {    
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    const inputDate = new Date(year, month - 1, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = now.getTime() - inputDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffMonths < 12) {
      const remainingDays = diffDays % 30;
      return remainingDays > 0
        ? `${diffMonths} month${diffMonths > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''} ago`
        : `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else {
      const remainingMonths = diffMonths % 12;
      return remainingMonths > 0
        ? `${diffYears} year${diffYears > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`
        : `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    }
  }


  // getHoursAgo(datetime: string): string {
  //   console.log(datetime);
  //   const date = new Date(datetime);
  //   const now = new Date();
  //   const diffMs = now.getTime() - date.getTime();

  //   const minutes = Math.floor(diffMs / (1000 * 60));
  //   const hours = Math.floor(diffMs / (1000 * 60 * 60));
  //   const days = Math.floor(hours / 24);
  //   const months = Math.floor(days / 30);
  //   const years = Math.floor(months / 12);

  //   if (years >= 1) {
  //     const remainingMonths = months % 12;
  //     return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
  //   }

  //   if (months >= 1) {
  //     const remainingDays = days % 30;
  //     return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months}m`;
  //   }

  //   if (days >= 1) {
  //     const remainingHours = hours % 24;
  //     return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  //   }

  //   if (hours >= 1) {
  //     const remainingMinutes = minutes % 60;
  //     return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  //   }

  //   return `${minutes}mn`;
  // }
}

