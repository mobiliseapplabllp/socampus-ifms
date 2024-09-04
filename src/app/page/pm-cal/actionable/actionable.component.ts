import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonDatetime } from '@ionic/angular';

@Component({
  selector: 'app-actionable',
  templateUrl: './actionable.component.html',
  styleUrls: ['./actionable.component.scss'],
})
export class ActionableComponent  implements OnInit {
  @ViewChild('popoverDatetime')  popoverDatetime!: IonDatetime;
  requestedData: any = [];
  status = 'actionable';
  actionableArr = [{
    cat: 'Air Dryer',
    qus: 'Q4. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q2. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q1. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q4. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q8. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q4. Check the door and window glass are cleaned'
  },{
    cat: 'Air Dryer',
    qus: 'Q4. Check the door and window glass are cleaned'
  }];
  allRes: any = [{
    cat: 'Air Compressor',
    total: 10,
    action: 8,
    progress1: 1,
  },{
    cat: 'Air Compressor',
    total: 14,
    action: 4,
    progress1: 0.7,
  },{
    cat: 'Air Compressor',
    total: 20,
    action: 12,
    progress1: 0.9,
  },{
    cat: 'Air Compressor',
    total: 30,
    action: 19,
    progress1: 1,
  }]
  isOpen = false;
  isPreOpen = false;
  questionList: any = [{
    q_desc: 'Lorem ipsum, dolor sit amet consectetur adipisicing elit. Recusandae quis suscipit, quas possimus labore placeat odio laudantium aliquam mollitia illo? Ipsum facilis accusantium aliquid porro sunt, doloremque possimus quisquam harum.',
    options: [{
      optn_desc: 'Yes',
      optn_id: 1
    },{
      optn_desc: 'No',
      optn_id: 2
    },{
      optn_desc: 'NA',
      optn_id: 3
    }]
  }];
  previousResponse: any = [{
    date: '24 feb, 2024',
    rspns: 'NA',
    remark: 'This is remark',
  },{
    date: '24 feb, 2024',
    rspns: 'NA',
    remark: 'This is remark',
  },{
    date: '24 feb, 2024',
    rspns: 'NA',
    remark: 'This is remark',
  },{
    date: '24 feb, 2024',
    rspns: 'NA',
    remark: 'This is remark',
  }]
  constructor(
    private activeroute: ActivatedRoute
  ) { }

  ngOnInit() {
    this.activeroute.queryParams.subscribe((res: any) => {
      this.requestedData = JSON.parse(res.data);
      console.log(this.requestedData);
    });
  }

  openActionModal(status: boolean) {
    this.isOpen = true;
  }

  changeDate() {
    this.popoverDatetime.confirm(true);
  }

  onWillPresent() {
    this.isPreOpen = false;
  }

}
