import { AfterViewInit, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { SignaturePad } from 'angular2-signaturepad';

@Component({
  selector: 'app-signature',
  templateUrl: './signature.component.html',
  styleUrls: ['./signature.component.scss'],
})
export class SignatureComponent implements OnInit, AfterViewInit {
  @ViewChild(SignaturePad, { static: true }) signaturePad!: SignaturePad;
  public signaturePadOptions: any = {
    minWidth: 1.5,
    maxWidth: 3,
    penColor: '#1a1a1a',
    backgroundColor: 'rgba(0,0,0,0)',
    canvasWidth: 800,
    canvasHeight: 300,
  };
  hasDrawn = false;

  constructor(
    public modalCtrl: ModalController,
    private toastCtrl: ToastController,
  ) { }

  ngOnInit() {}

  ngAfterViewInit() {
    this.fitCanvasToParent();
  }

  @HostListener('window:resize')
  onResize() {
    this.fitCanvasToParent();
  }

  private fitCanvasToParent() {
    const canvas: HTMLCanvasElement | undefined = (this.signaturePad as any)?.elementRef?.nativeElement?.querySelector('canvas');
    if (!canvas) {
      return;
    }
    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : canvas.offsetWidth;
    if (!width) {
      return;
    }
    this.signaturePad.set('canvasWidth', width);
    this.signaturePad.set('canvasHeight', 300);
    this.signaturePad.clear();
    this.hasDrawn = false;
  }

  closeModal(data: any, status: any) {
    this.modalCtrl.dismiss(data, status);
  }

  drawStart() {
    this.hasDrawn = true;
  }

  drawComplete() {
    this.hasDrawn = !this.signaturePad?.isEmpty();
  }

  clear() {
    this.signaturePad?.clear();
    this.hasDrawn = false;
  }

  async submit() {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      const toast = await this.toastCtrl.create({
        message: 'Please draw your signature before submitting',
        duration: 1800,
        color: 'warning',
        position: 'top',
      });
      toast.present();
      return;
    }
    this.closeModal(this.signaturePad.toDataURL(), true);
  }
}
