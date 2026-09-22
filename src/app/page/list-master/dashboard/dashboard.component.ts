import { Component, Input, OnInit } from '@angular/core';
import { CommonService } from 'src/app/provider/common/common.service';
import { ListMasterService } from 'src/app/provider/list-master/list-master.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent  implements OnInit {
  @Input() eventChange: any
  breakdown : any = {};
  pms: any = {};
  indent: any = {};
  meter: any = {};
  digital: any = {};
  /**
   * Ek waqt me ek hi card, poori chaudai me - pehle 1.5 card dikhte the to dono
   * kinaron par aadhe card kate hue lagte the. Ab neeche bullet batate hain ki
   * kitne card hain aur kaunsa khula hai.
   */
  option = {
    slidesPerView: 1,
    centeredSlides: true,
    // Aakhri card ke baad pehle par - slides ab sthir hain (cards list ek hi baar
    // banti hai), isliye loop se bullets dugne nahi honge
    loop: true,
    spaceBetween: 12,
    pagination: {
      el: '.dash-pager',
      clickable: true
    }
  }
  /**
   * Card ka data ek hi jagah - pehle chaaron slide ka HTML alag-alag likha tha,
   * to ek chhota badlav chaar jagah karna padta tha.
   *
   * Ye getter nahi hai: getter har change detection par nayi array deta tha,
   * jisse *ngFor slides dobara banata aur Swiper me card repeat ho jaate the.
   */
  cards: any[] = [];

  private buildCards(): void {
    this.cards = [
      {
        icon: 'assets/home_banner1/helpdesk.png',
        title: 'Helpdesk',
        subtitle: 'Tickets & requests',
        stats: [
          { label: 'Assign', value: this.breakdown.assign },
          { label: 'In Progress', value: this.breakdown.wip },
          { label: 'Re Open', value: this.breakdown.reopen }
        ]
      },
      {
        icon: 'assets/home_banner1/checklist.png',
        title: 'Checklist',
        subtitle: 'Daily digital checks',
        stats: [
          { label: 'Scheduled', value: this.digital.scheduled },
          { label: 'Attended', value: this.digital.attended },
          { label: 'Missed', value: this.digital.missed }
        ]
      },
      {
        icon: 'assets/home_banner1/pms.png',
        title: 'PPM',
        subtitle: 'Preventive maintenance',
        stats: [
          { label: 'Scheduled', value: this.pms.assign },
          { label: 'Assign', value: this.pms.assign },
          { label: 'Actionable', value: this.pms.actionable }
        ]
      },
      {
        icon: 'assets/home_banner1/meter.png',
        title: 'Meter',
        subtitle: 'Meter readings',
        stats: [
          { label: 'Scheduled', value: this.meter.scheduled },
          { label: 'Attended', value: this.meter.attended },
          { label: 'Missed', value: this.meter.missed }
        ]
      }
    ];
  }

  /** Swiper ko wahi card dobara na banana pade */
  trackByTitle(_i: number, card: any): string {
    return card.title;
  }

  constructor(
    private httpList: ListMasterService,
    private common: CommonService
  ) { }

  ngOnInit() {
    this.buildCards();
  }

  ngOnChanges() {
    if (this.eventChange) {
      this.common.checkInternet().then(res => {
        if (res) {
          this.getDashboard();
        } else {
          let temp: any = JSON.parse(localStorage.getItem('dashboard')!);
          this.breakdown = temp.breakdown;
          this.pms = temp.pms
          this.indent = temp.indent,
          this.meter = temp.meter,
          this.digital = temp.digital;
          this.buildCards();
        }
      });
    }
  }

  getDashboard() {
    this.httpList.getDashboard().subscribe(data => {
      if (data.status) {
        this.breakdown =  data.data?.breakdown || {};
        this.pms = data.data.pms || {};
        // this.indent = data.data.indent.assign.toString();
        this.meter = data.data?.meter || {}
        this.digital = data?.data?.dc || {}
        const obj = {
          breakdown: this.breakdown,
          pms: this.pms,
          indent: this.indent,
          meter: this.meter,
          digital: this.digital
        };
        localStorage.setItem('dashboard', JSON.stringify(obj));
        this.buildCards();
      }
    });
  }

}
