import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModalController } from '@ionic/angular';
import { CommonService } from 'src/app/provider/common/common.service';

/**
 * Ek hi player dono jagah ke liye:
 *  - `blob` mila (abhi record ki / Dexie me rakhi) -> turant, bina internet
 *  - sirf `url` mila (cache saaf, server path) -> blob-url API se laakar
 */
@Component({
  selector: 'app-video-preview',
  templateUrl: './video-preview.component.html',
  styleUrls: ['./video-preview.component.scss'],
})
export class VideoPreviewComponent implements OnInit, OnDestroy {
  blob?: Blob | null;
  url?: string;
  blobType = 'PRIVATE';
  title = 'Video';
  /** Angular 15 ka sanitizer `blob:` ko `unsafe:blob:` bana deta hai - isliye bypass (PhotoViewComponent jaisa) */
  src: SafeUrl | null = null;
  private objectUrl = '';
  loading = false;
  errorMsg = '';
  private fileInfo = '';

  constructor(
    private modalCtrl: ModalController,
    private common: CommonService,
    private sanitizer: DomSanitizer
  ) { }

  async ngOnInit() {
    if (this.blob instanceof Blob) {
      this.setSource(this.blob);
      return;
    }
    if (!this.url) {
      this.errorMsg = 'Video not available';
      return;
    }
    this.loading = true;
    try {
      this.setSource(await this.common.fetchPrivateFile(this.url, this.blobType));
    } catch {
      this.errorMsg = 'Could not load video';
    } finally {
      this.loading = false;
    }
  }

  private setSource(blob: Blob) {
    this.revoke();
    this.fileInfo = `${blob.type || 'unknown type'}, ${Math.round(blob.size / 1024)} KB`;
    this.objectUrl = URL.createObjectURL(blob);
    this.src = this.sanitizer.bypassSecurityTrustUrl(this.objectUrl);
  }

  /** WebView file decode na kar paye (jaise 3gp/H.263) to kaali screen ki jagah wajah dikhe */
  onVideoError(ev: Event) {
    const code = (ev.target as HTMLVideoElement)?.error?.code;
    console.warn('[video-preview] playback error', code, this.fileInfo);
    this.revoke();
    this.errorMsg = `This video format is not supported on this device (${this.fileInfo}, error ${code ?? '-'})`;
  }

  private revoke() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = '';
    }
    this.src = null;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  ngOnDestroy() {
    this.revoke();
  }
}
