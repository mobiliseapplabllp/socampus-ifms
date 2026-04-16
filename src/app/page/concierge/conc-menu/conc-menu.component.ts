import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { LocationTracker } from 'capacitor-location-tracker-sqlite';
import { CommonService } from 'src/app/provider/common/common.service';

@Component({
  selector: 'app-conc-menu',
  templateUrl: './conc-menu.component.html',
  styleUrls: ['./conc-menu.component.scss'],
})
export class ConcMenuComponent implements OnInit {

  constructor(
    private router: Router,
    private platform: Platform,
    private common: CommonService,
    private alertController: AlertController,
  ) { }

  ngOnInit() {}

  ionViewDidEnter() {
    if (this.platform.is('capacitor')) {
      void this.ensureLocationTrackingReadinessOnEntry();
    }
    // this.getTicketList();
  }

  openMenu(status: string) {
    this.router.navigate(['/concierge'], { queryParams: { status } });
  }

  createTicket() {
    this.router.navigateByUrl('/concierge/cr-ticket');
  }

  private async ensureLocationTrackingReadinessOnEntry() {
    try {
      let hasBackgroundPermission = await this.checkBackgroundPermission();

      if (!hasBackgroundPermission) {
        const goToSettings = await this.showLocationAlwaysInstructionModal();
        if (!goToSettings) {
          return;
        }        
        await LocationTracker.requestBackgroundPermissions();
        return;
      }

      if (this.platform.is('android')) {
        await this.ensureBatteryOptimizationIgnored();
      }
    } catch (e) {
      console.error('ensureLocationTrackingReadinessOnEntry', e);
      this.common.presentToast('Could not complete location permission setup.', 'warning');
    }
  }

  private async checkBackgroundPermission() {
    const { allowed } = await LocationTracker.requestBackgroundPermissionsCheck();
    return allowed;
  }

  private async showLocationAlwaysInstructionModal(): Promise<boolean> {
    const msg = this.platform.is('ios')
      ? 'For concierge GPS trips, Location must be set to "Always".\n\nTap "Go to Settings", then choose Always for this app.'
      : 'For background GPS tracking, you must allow location "All the time" (not only while using the app).\n\nTap "Go to Settings" and select Allow all the time.';
    const alert = await this.alertController.create({
      header: 'Location access',
      message: msg,
      mode: this.platform.is('ios') ? 'ios' : 'md',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Go to Settings', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  private async ensureBatteryOptimizationIgnored(): Promise<void> {
    const { allowed } = await LocationTracker.requestIgnoreBatteryOptimizationsCheck();
    if (allowed) {
      return;
    }
    const alert = await this.alertController.create({
      header: 'Battery Optimization',
      message: 'To ensure GPS tracking works continuously in the background, please disable battery optimization for this app.\n\nTap "Go to Settings" and select "Don\'t optimize".',
      mode: 'md',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        { text: 'Go to Settings', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await LocationTracker.requestIgnoreBatteryOptimizations();
    }
  }

}
