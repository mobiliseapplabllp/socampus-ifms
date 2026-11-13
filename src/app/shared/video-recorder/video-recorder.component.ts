import { Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';

/**
 * 854x480 (16:9) @ ~1 Mbps: 30 sec ≈ 4 MB, 60 sec ≈ 7.5 MB. Size bitrate se tay hota hai, resolution se nahi.
 * 16:9 isliye ki phone ka apna camera video bhi 16:9 me kaat ke dikhata hai - 4:3 maangne par poora sensor
 * aata tha aur cheezein door/chhoti lagti thi.
 */
const VIDEO_WIDTH = 854;
const VIDEO_HEIGHT = 480;
const MAX_SECONDS = 60;
const VIDEO_BITRATE = 1_000_000;
const AUDIO_BITRATE = 64_000;
/** Android par webm/VP8 (complaint wala CaptureComponent bhi yahi bhejta hai), iOS par sirf mp4 bharosemand */
const MP4_FIRST = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];
const WEBM_FIRST = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4'];

export interface RecordedVideo {
  blob: Blob;
  ext: string;
}

/** Modal ke dismiss role - `unsupported` aaye to caller purana native capture chalaye */
export type VideoRecorderRole = 'recorded' | 'cancel' | 'unsupported';

export function videoExtFromType(type: string | undefined): string {
  const t = String(type || '').toLowerCase();
  if (t.includes('webm')) {
    return '.webm';
  }
  if (t.includes('quicktime')) {
    return '.mov';
  }
  if (t.includes('3gp')) {
    return '.3gp';
  }
  return '.mp4';
}

@Component({
  selector: 'app-video-recorder',
  templateUrl: './video-recorder.component.html',
  styleUrls: ['./video-recorder.component.scss'],
})
export class VideoRecorderComponent implements OnDestroy {
  @ViewChild('preview', { static: true }) preview!: ElementRef<HTMLVideoElement>;
  readonly maxSeconds = MAX_SECONDS;
  starting = true;
  recording = false;
  elapsed = 0;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private tick: any = null;
  private finished = false;

  constructor(
    private modalCtrl: ModalController,
    private ngZone: NgZone,
    private platform: Platform
  ) { }

  /** ngOnInit me nahi - present poora hone se pehle dismiss kiya to modal atak jaata hai */
  async ionViewDidEnter() {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('unsupported');
      }
      this.stream = await navigator.mediaDevices.getUserMedia(this.cameraConstraints());
      if (this.finished) {
        this.releaseCamera();
        return;
      }
      await this.switchToMainBackLens();
      if (this.finished || !this.stream) {
        this.releaseCamera();
        return;
      }
      const track = this.stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      console.log('[video-recorder] camera', track?.label, `${settings?.width}x${settings?.height}`);
      const el = this.preview.nativeElement;
      el.srcObject = this.stream;
      el.muted = true;
      await el.play().catch(() => { /* autoplay attribute bhi hai */ });
      this.starting = false;
    } catch (err) {
      console.warn('[video-recorder] in-app camera unavailable, falling back to native capture', err);
      this.finish(null, 'unsupported');
    }
  }

  private cameraConstraints(deviceId?: string): MediaStreamConstraints {
    return {
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
        width: { ideal: VIDEO_WIDTH },
        height: { ideal: VIDEO_HEIGHT },
        frameRate: { ideal: 24 },
      },
      audio: true,
    };
  }

  /**
   * `facingMode: environment` kai Samsung par ultra-wide (0.5x) lens de deta hai - video door se li hui lagti hai.
   * Labels permission ke baad hi milte hain, isliye pehle khol ke phir main lens par switch.
   */
  private async switchToMainBackLens() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const main = this.pickMainBackCamera(devices);
      const currentId = this.stream?.getVideoTracks()[0]?.getSettings().deviceId;
      if (!main?.deviceId || main.deviceId === currentId || this.finished) {
        return;
      }
      this.releaseCamera();
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(this.cameraConstraints(main.deviceId));
      } catch {
        // Kuch phone turant dobara kholne par mana karte hain - default back camera hi sahi
        this.stream = await navigator.mediaDevices.getUserMedia(this.cameraConstraints());
      }
    } catch (err) {
      console.warn('[video-recorder] main lens switch skipped', err);
    }
  }

  private pickMainBackCamera(devices: MediaDeviceInfo[]): MediaDeviceInfo | undefined {
    const back = devices.filter(d => d.kind === 'videoinput' && /back|rear|environment/i.test(d.label));
    if (!back.length) {
      return undefined;
    }
    // iOS: "Back Camera" main hai; "Back Ultra Wide Camera" / "Back Telephoto Camera" alag naam se aate hain
    const iosMain = back.find(d => /^back camera$/i.test(d.label.trim()));
    if (iosMain) {
      return iosMain;
    }
    // Android: "camera2 0, facing back" - sabse chhota index main lens hota hai
    const index = (d: MediaDeviceInfo) => {
      const m = /camera2?\s*(\d+)/i.exec(d.label);
      return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
    };
    return [...back].sort((a, b) => index(a) - index(b))[0];
  }

  start() {
    if (!this.stream || this.recording) {
      return;
    }
    const candidates = this.platform.is('ios') ? MP4_FIRST : WEBM_FIRST;
    const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t));
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: VIDEO_BITRATE,
      audioBitsPerSecond: AUDIO_BITRATE,
    };
    if (mimeType) {
      options.mimeType = mimeType;
    }
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, options);
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data?.size) {
        this.chunks.push(e.data);
      }
    };
    // MediaRecorder ke events zone ke bahar aa sakte hain
    this.recorder.onstop = () => this.ngZone.run(() => this.onRecorderStop());
    this.recorder.onerror = (e: Event) => this.ngZone.run(() => {
      console.warn('[video-recorder] recorder error', mimeType, e);
      this.finish(null, 'unsupported');
    });
    this.recorder.start(1000);
    this.recording = true;
    this.elapsed = 0;
    this.tick = setInterval(() => {
      this.elapsed++;
      if (this.elapsed >= MAX_SECONDS) {
        this.stop();
      }
    }, 1000);
  }

  stop() {
    this.clearTick();
    this.recording = false;
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
  }

  cancel() {
    this.finish(null, 'cancel');
  }

  private onRecorderStop() {
    if (this.finished) {
      return;
    }
    const type = (this.recorder?.mimeType || 'video/mp4').split(';')[0];
    const blob = new Blob(this.chunks, { type });
    this.chunks = [];
    if (!blob.size) {
      this.finish(null, 'cancel');
      return;
    }
    this.finish({ blob, ext: videoExtFromType(type) }, 'recorded');
  }

  private finish(data: RecordedVideo | null, role: VideoRecorderRole) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.cleanup();
    this.modalCtrl.dismiss(data, role);
  }

  private clearTick() {
    if (this.tick) {
      clearInterval(this.tick);
      this.tick = null;
    }
  }

  private releaseCamera() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.preview?.nativeElement) {
      this.preview.nativeElement.srcObject = null;
    }
  }

  private cleanup() {
    this.clearTick();
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.recorder = null;
    this.releaseCamera();
  }

  ngOnDestroy() {
    this.finished = true;
    this.cleanup();
  }
}
