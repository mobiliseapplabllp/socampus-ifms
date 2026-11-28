import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { MailroomService } from 'src/app/provider/mailroom/mailroom.service';

/**
 * Mail Room Management ka entry point.
 * SSO -> (dono panel hon to) panel chunna -> (kai sites hon to) site chunna -> home / my-package.
 * Aage ka page is page ko replace karta hai, isliye back seedha app ke home par jaata hai.
 */
@Component({
  selector: 'app-mailroom-mgt',
  templateUrl: './mailroom-mgt.page.html',
  styleUrls: ['./mailroom-mgt.page.scss'],
})
export class MailroomMgtPage implements OnInit {

  state: 'loading' | 'error' | 'choose' | 'site' = 'loading';
  errorMsg = '';

  constructor(
    public mr: MailroomService,
    private navCtrl: NavController,
  ) { }

  ngOnInit() {
    this.start();
  }

  async start() {
    this.state = 'loading';
    try {
      const res = await this.mr.sso();
      if (res.mode === 'portal') {
        this.go('/mailroom-mgt/my-package');
        return;
      }
      if (!res.panelGiven && res.panels.includes('panel') && res.panels.includes('packages')) {
        this.state = 'choose';
        return;
      }
      await this.openStaff();
    } catch (err) {
      this.fail(err);
    }
  }

  async openStaff() {
    this.state = 'loading';
    try {
      const { needsSite } = await this.mr.loadStaff();
      if (needsSite) {
        this.state = 'site';
      } else {
        this.go('/mailroom-mgt/home');
      }
    } catch (err) {
      this.fail(err);
    }
  }

  async openMyPackage() {
    this.state = 'loading';
    try {
      await this.mr.openPortalFromStaff();
      this.go('/mailroom-mgt/my-package');
    } catch (err) {
      this.fail(err);
    }
  }

  async pickSite(site: any) {
    this.state = 'loading';
    try {
      await this.mr.selectProperty(site.id);
      this.go('/mailroom-mgt/home');
    } catch (err) {
      this.fail(err);
    }
  }

  private fail(err: any) {
    this.errorMsg = this.mr.msg(err);
    this.state = 'error';
  }

  private go(url: string) {
    this.navCtrl.navigateForward(url, { replaceUrl: true });
  }
}
