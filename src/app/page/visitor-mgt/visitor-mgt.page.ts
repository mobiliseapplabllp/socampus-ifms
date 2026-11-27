import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { VmsService } from 'src/app/provider/vms/vms.service';
import { CommonService } from 'src/app/provider/common/common.service';
import { environment } from 'src/environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-visitor-mgt',
  templateUrl: './visitor-mgt.page.html',
  styleUrls: ['./visitor-mgt.page.scss'],
})
export class VisitorMgtPage implements OnInit {

  initials = '';
  filters = ['All', 'Upcoming', 'Today', 'Past'];
  activeFilter = 'All';
  searchText = '';

  invites: any[] = [];
  filteredInvites: any[] = [];
  loading = false;

  page = 1;
  limit = 20;

  modalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  editingId: number | null = null;
  submitting = false;

  qrOpen = false;
  qrInvite: any = null;

  // QR-based approval
  qrApprovalOpen = false;
  qrSegment: 'poster' | 'pending' = 'poster';
  qrSites: any[] = [];
  qrSelectedSite: any = '';
  qrLoadingSites = false;
  pendingRequests: any[] = [];
  qrLoadingPending = false;
  private readonly portalBase = environment.vmsPortalUrl;

  dtPickerOpen = false;

  form: any = this.emptyForm();

  hostOptions: { id: any; name: string; email?: string }[] = [];
  siteOptions: { id: any; name: string }[] = [];
  buildingOptions: { id: any; name: string }[] = [];
  visitorTypeOptions: { id: any; name: string; code?: string; color?: string }[] = [];
  visitPurposeOptions: { id: any; name: string }[] = [];
  floorOptions: { id: any; name: string }[] = [];
  parkingZoneOptions: { id: any; name: string }[] = [];
  meetingRoomOptions: { id: any; name: string }[] = [];

  // full host list (host + tenant_admin) used to filter by selected site
  private allHosts: any[] = [];
  sitePolicies: any[] = [];
  siteTimezone = '';
  loadingHosts = false;
  loadingBuildings = false;
  loadingSubLocation = false;

  locationTypeOptions = [
    { value: '', label: 'None' },
    { value: 'meeting_room', label: 'Meeting Room' },
    { value: 'parking', label: 'Parking Zone' },
    { value: 'floor', label: 'Floor' },
  ];

  durationOptions = [15, 30, 45, 60, 90, 120, 180, 240, 480];

  constructor(
    private router: Router,
    private common: CommonService,
    private vms: VmsService,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    // Pehle VMS token (SSO), phir invites
    this.loading = true;
    this.vms.ssoLogin().subscribe({
      next: () => {
        const user = this.vms.getUser();
        this.initials = this.firstLetter(user?.name);
        this.loadInvites();
      },
      error: (err: any) => {
        console.log('VMS SSO error:', err);
        this.loading = false;
        this.common.presentToast(err?.error?.message || err?.message || 'VMS login failed', 'danger');
      },
    });
  }

  private firstLetter(name: string): string {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase() || '?';
  }


  loadInvites() {
    this.loading = true;
    this.vms.getInvites({ page: this.page, limit: this.limit }).subscribe({
      next: (res: any) => {
        this.invites = res?.data || [];
        this.refreshLookups();
        this.applyClientFilter();
        this.loading = false;
      },
      error: (err) => {
        console.log(err);
        this.loading = false;
      },
    });
  }

  applyClientFilter() {
    const term = (this.searchText || '').toLowerCase().trim();
    let list = [...this.invites];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    if (this.activeFilter === 'Upcoming') {
      list = list.filter(i => new Date(i.visit_date_time) > now);
    } else if (this.activeFilter === 'Today') {
      list = list.filter(i => {
        const d = new Date(i.visit_date_time);
        return d >= todayStart && d < todayEnd;
      });
    } else if (this.activeFilter === 'Past') {
      list = list.filter(i => new Date(i.visit_date_time) < todayStart);
    }

    if (term) {
      list = list.filter(i =>
        (i.visitor_name || '').toLowerCase().includes(term) ||
        (i.visitor_email || '').toLowerCase().includes(term) ||
        (i.visitor_company || '').toLowerCase().includes(term) ||
        (i.host_name || '').toLowerCase().includes(term)
      );
    }

    this.filteredInvites = list;
  }

  setFilter(f: string) {
    this.activeFilter = f;
    this.applyClientFilter();
  }

  onSearchChange() { this.applyClientFilter(); }

  openCreate() {
    this.modalMode = 'create';
    this.editingId = null;
    this.form = this.emptyForm();
    this.resetSiteDependent();
    this.loadCreateLookups();
    this.modalOpen = true;
  }

  /** Hosts + tenant_admins, visitor types, visit purposes, sites */
  private loadCreateLookups() {
    this.loadingHosts = true;
    forkJoin({
      hosts: this.vms.getUsers({ status: 'active', role: 'host' }),
      admins: this.vms.getUsers({ status: 'active', role: 'tenant_admin' }),
      types: this.vms.getVisitorTypes(),
      purposes: this.vms.getVisitPurposes(),
      sites: this.vms.getSites({ page: 1, limit: 1000 }),
    }).subscribe({
      next: (res: any) => {
        const hosts = res.hosts?.data || [];
        const admins = res.admins?.data || [];
        this.allHosts = [...hosts, ...admins];

        this.visitorTypeOptions = (res.types?.data || []).map((t: any) => ({
          id: t.id, name: t.name, code: t.code, color: t.color,
        }));
        this.visitPurposeOptions = (res.purposes?.data || []).map((p: any) => ({ id: p.id, name: p.name }));
        this.siteOptions = (res.sites?.data || [])
          .filter((s: any) => s.is_active)
          .map((s: any) => ({ id: s.id, name: s.name }));

        this.applyHostFilter();
        this.loadingHosts = false;
      },
      error: (err: any) => { console.log(err); this.loadingHosts = false; },
    });
  }

  /** Only hosts mapped to the selected site (when a site is chosen) */
  private applyHostFilter() {
    const sid = this.form.siteId;
    let list = this.allHosts;
    if (sid) {
      list = this.allHosts.filter((u: any) => Array.isArray(u.site_ids) && u.site_ids.includes(sid));
    }
    this.hostOptions = list.map((u: any) => ({ id: u.id, name: u.name, email: u.email }));
  }

  onSiteChange() {
    // selected host/location no longer valid for a new site
    this.form.hostId = '';
    this.form.buildingId = '';
    this.form.locationType = '';
    this.form.floorId = '';
    this.form.parkingZoneId = '';
    this.form.meetingRoomId = '';
    this.resetSiteDependent();
    this.applyHostFilter();
    if (this.form.siteId) this.loadSiteDependent(this.form.siteId);
  }

  private loadSiteDependent(sid: any) {
    this.loadingBuildings = true;
    this.vms.getBuildings(sid).subscribe({
      next: (res: any) => {
        this.buildingOptions = (res?.data || []).map((b: any) => ({ id: b.id, name: b.name }));
        this.loadingBuildings = false;
      },
      error: () => { this.loadingBuildings = false; },
    });

    this.vms.getParkingZones(sid).subscribe({
      next: (res: any) => { this.parkingZoneOptions = (res?.data || []).map((p: any) => ({ id: p.id, name: p.name })); },
      error: () => {},
    });

    this.vms.getSiteSchedule(sid).subscribe({
      next: (res: any) => { this.siteTimezone = res?.data?.timezone || ''; },
      error: () => { this.siteTimezone = ''; },
    });

    this.vms.getSitePolicies(sid).subscribe({
      next: (res: any) => { this.sitePolicies = res?.data || []; },
      error: () => { this.sitePolicies = []; },
    });
  }

  onBuildingChange() {
    // floors belong to a building → reload; reset everything below
    this.form.locationType = '';
    this.form.floorId = '';
    this.form.meetingRoomId = '';
    this.form.parkingZoneId = '';
    this.floorOptions = [];
    this.meetingRoomOptions = [];
    if (this.form.buildingId) this.loadFloors(this.form.buildingId);
  }

  private loadFloors(buildingId: any) {
    this.loadingSubLocation = true;
    this.vms.getFloors(buildingId).subscribe({
      next: (res: any) => { this.floorOptions = (res?.data || []).map((f: any) => ({ id: f.id, name: f.name })); this.loadingSubLocation = false; },
      error: () => { this.loadingSubLocation = false; },
    });
  }

  onLocationTypeChange() {
    // floors already loaded on building change; parking on site change
    this.form.floorId = '';
    this.form.meetingRoomId = '';
    this.form.parkingZoneId = '';
    this.meetingRoomOptions = [];
  }

  onFloorChange() {
    // meeting rooms belong to a floor
    this.form.meetingRoomId = '';
    this.meetingRoomOptions = [];
    if (this.form.locationType === 'meeting_room' && this.form.floorId) {
      this.loadingSubLocation = true;
      this.vms.getMeetingRooms(this.form.floorId).subscribe({
        next: (res: any) => { this.meetingRoomOptions = (res?.data || []).map((m: any) => ({ id: m.id, name: m.name })); this.loadingSubLocation = false; },
        error: () => { this.loadingSubLocation = false; },
      });
    }
  }

  private resetSiteDependent() {
    this.buildingOptions = [];
    this.floorOptions = [];
    this.parkingZoneOptions = [];
    this.meetingRoomOptions = [];
    this.sitePolicies = [];
    this.siteTimezone = '';
  }

  get phoneDigits(): number {
    return (this.form?.visitorPhone || '').replace(/\D/g, '').length;
  }
  get phoneValid(): boolean {
    const n = this.phoneDigits;
    return n >= 7 && n <= 15;
  }

  // ===== Group Invite =====
  groupInviteOpen = false;
  groupSubmitting = false;
  maxGroupVisitors = 50;
  groupForm: any = this.emptyGroupForm();
  groupVisitors: { name: string; email: string }[] = [{ name: '', email: '' }, { name: '', email: '' }];

  openGroupInvite() {
    this.groupForm = this.emptyGroupForm();
    this.groupVisitors = [{ name: '', email: '' }, { name: '', email: '' }];
    this.resetSiteDependent();
    this.hostOptions = [];
    this.loadCreateLookups();
    this.groupInviteOpen = true;
  }

  closeGroupInvite() { this.groupInviteOpen = false; }

  private emptyGroupForm() {
    return {
      siteId: '', hostId: '', buildingId: '', floorId: '', meetingRoomId: '',
      visitDateTime: '', visitDuration: 60, purpose: '', visitorTypeId: '',
      customMessage: '', additionalInstructions: '', sendEmail: true, includeCalendar: true,
    };
  }

  onGroupSiteChange() {
    this.groupForm.hostId = '';
    this.groupForm.buildingId = '';
    this.groupForm.floorId = '';
    this.groupForm.meetingRoomId = '';
    this.buildingOptions = [];
    this.floorOptions = [];
    this.meetingRoomOptions = [];
    this.siteTimezone = '';
    // hosts mapped to selected site
    const sid = this.groupForm.siteId;
    this.hostOptions = sid
      ? this.allHosts.filter((u: any) => Array.isArray(u.site_ids) && u.site_ids.includes(sid))
          .map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
      : [];
    if (sid) this.loadSiteDependent(sid);
  }

  onGroupBuildingChange() {
    this.groupForm.floorId = '';
    this.groupForm.meetingRoomId = '';
    this.floorOptions = [];
    this.meetingRoomOptions = [];
    if (this.groupForm.buildingId) this.loadFloors(this.groupForm.buildingId);
  }

  onGroupFloorChange() {
    this.groupForm.meetingRoomId = '';
    this.meetingRoomOptions = [];
    if (this.groupForm.floorId) {
      this.vms.getMeetingRooms(this.groupForm.floorId).subscribe({
        next: (res: any) => { this.meetingRoomOptions = (res?.data || []).map((m: any) => ({ id: m.id, name: m.name })); },
        error: () => {},
      });
    }
  }

  get groupValidVisitors(): { name: string; email: string }[] {
    return this.groupVisitors.filter(v => v.name?.trim() && v.email?.trim());
  }

  addGroupVisitor() {
    if (this.groupVisitors.length >= this.maxGroupVisitors) {
      this.common.presentToast(`Max ${this.maxGroupVisitors} visitors`, 'warning');
      return;
    }
    this.groupVisitors.push({ name: '', email: '' });
  }

  removeGroupVisitor(i: number) {
    this.groupVisitors.splice(i, 1);
    if (!this.groupVisitors.length) this.groupVisitors.push({ name: '', email: '' });
  }

  trackByIndex = (i: number) => i;

  sendGroupInvite() {
    const f = this.groupForm;
    if (!f.siteId || !f.hostId || !f.buildingId || !f.visitDateTime || !f.purpose) {
      this.common.presentToast('Please fill all required fields', 'danger');
      return;
    }
    const visitors = this.groupValidVisitors;
    if (!visitors.length) {
      this.common.presentToast('Add at least one visitor (name & email)', 'danger');
      return;
    }

    const payload: any = {
      visitors,
      visitorTypeId: f.visitorTypeId || null,
      hostId: f.hostId,
      siteId: f.siteId,
      buildingId: f.buildingId,
      visitDateTime: new Date(f.visitDateTime).toISOString(),
      visitDuration: Number(f.visitDuration) || 60,
      purpose: f.purpose,
      customMessage: f.customMessage,
      additionalInstructions: f.additionalInstructions,
      sendEmail: !!f.sendEmail,
      includeCalendar: !!f.includeCalendar,
    };
    if (f.floorId) payload.floorId = f.floorId;
    if (f.meetingRoomId) payload.meetingRoomId = f.meetingRoomId;

    this.groupSubmitting = true;
    this.vms.createBulkInvite(payload).subscribe({
      next: () => {
        this.common.presentToast(`Group invite sent to ${visitors.length} visitor(s)`, 'success');
        this.groupSubmitting = false;
        this.closeGroupInvite();
        this.loadInvites();
      },
      error: (err: any) => {
        this.groupSubmitting = false;
        this.common.presentToast(err?.error?.message || 'Failed to send group invite', 'danger');
      },
    });
  }

  openPolicyDoc(p: any) {
    const url = p?.document_url || p?.documentUrl || p?.attachment_url || p?.file_url;
    if (url) {
      window.open(url, '_blank');
    } else {
      this.common.presentToast(p?.name || 'No document attached', 'primary');
    }
  }

  openQrApproval() {
    this.qrSegment = 'poster';
    this.qrApprovalOpen = true;
    this.loadQrSites();
    this.loadPendingRequests();
  }

  closeQrApproval() { this.qrApprovalOpen = false; }

  onQrSegmentChange(ev: any) {
    this.qrSegment = ev?.detail?.value || 'poster';
    if (this.qrSegment === 'pending') {
      this.loadPendingRequests();
    }
  }

  loadQrSites() {
    this.qrLoadingSites = true;
    this.vms.getSites({ page: 1, limit: 1000 }).subscribe({
      next: (res: any) => {
        this.qrSites = (res?.data || []).filter((s: any) => s.is_active);
        if (!this.qrSelectedSite && this.qrSites.length) {
          this.qrSelectedSite = this.qrSites[0].id;
        }
        this.qrLoadingSites = false;
      },
      error: (err) => { console.log(err); this.qrLoadingSites = false; },
    });
  }

  loadPendingRequests() {
    this.qrLoadingPending = true;
    this.vms.getVisitorRequests().subscribe({
      next: (res: any) => {
        const all = res?.data || [];
        this.pendingRequests = all.filter((r: any) => r.status === 'pending');
        this.qrLoadingPending = false;
      },
      error: (err) => { console.log(err); this.qrLoadingPending = false; },
    });
  }

  private get tenantId(): any {
    const u = this.vms.getUser();
    if (u?.tenant_id != null && u.tenant_id !== '') return u.tenant_id;
    // fallback: read tenant_id from the JWT token payload
    try {
      const tok = this.vms.getToken();
      const payload = JSON.parse(atob(tok.split('.')[1]));
      return payload.tenant_id ?? payload.tenantId ?? '';
    } catch {
      return '';
    }
  }

  qrFormLink(): string {
    return `${this.portalBase}/visitor-request?tenant=${this.tenantId}&site=${this.qrSelectedSite}`;
  }

  qrApprovalImageUrl(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(this.qrFormLink())}`;
  }

  openFormLink() {
    window.open(this.qrFormLink(), '_blank');
  }

  qrSelectedSiteName(): string {
    const s = this.qrSites.find((x: any) => x.id === this.qrSelectedSite);
    return s?.name || '';
  }

  printPoster() {
    const win = window.open('', '_blank', 'width=600,height=800');
    if (!win) {
      this.common.presentToast('Allow pop-ups to print', 'warning');
      return;
    }
    const site = this.qrSelectedSiteName();
    win.document.write(`
      <html><head><title>Visitor Registration</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;padding:40px;color:#0f172a}
        h1{font-size:24px;margin:0 0 6px}
        p{color:#475569;margin:0 0 24px}
        img{width:320px;height:320px}
        .site{font-weight:700;font-size:18px;margin-bottom:24px}
      </style></head>
      <body>
        <h1>Scan to Register</h1>
        <p>Scan this QR code with your phone camera to open the visitor form.</p>
        <div class="site">${site}</div>
        <img src="${this.qrApprovalImageUrl()}" />
      </body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  downloadPng() {
    fetch(this.qrApprovalImageUrl())
      .then(r => r.blob())
      .then(blob => {
        const name = `visitor-qr-${this.qrSelectedSiteName().replace(/\s+/g, '-') || 'site'}.png`;
        this.saveBlob(blob, name);
        this.common.presentToast('QR downloaded', 'success');
      })
      .catch(() => this.common.presentToast('Failed to download QR', 'danger'));
  }

  // file-saver ki jagah - browser download (atithi me saveAs tha)
  private saveBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  openEdit(invite: any) {
    this.modalMode = 'edit';
    this.editingId = invite.id;
    this.form = {
      visitorName: invite.visitor_name || '',
      visitorEmail: invite.visitor_email || '',
      visitorCompany: invite.visitor_company || '',
      visitorPhone: invite.visitor_phone || '',
      visitorTypeId: invite.visitor_type_id || '',
      hostId: invite.host_id || '',
      siteId: invite.site_id || '',
      buildingId: invite.building_id || '',
      locationType: invite.floor_id ? 'floor' : invite.parking_zone_id ? 'parking' : invite.meeting_room_id ? 'meeting_room' : '',
      floorId: invite.floor_id || '',
      parkingZoneId: invite.parking_zone_id || '',
      meetingRoomId: invite.meeting_room_id || '',
      visitDateTime: invite.visit_date_time || '',
      visitDuration: invite.visit_duration || 60,
      purpose: invite.purpose || '',
      customMessage: invite.custom_message || '',
      additionalInstructions: invite.additional_instructions || '',
      sendEmail: true,
      includeCalendar: true,
    };
    this.resetSiteDependent();
    this.loadCreateLookups();
    if (this.form.siteId) {
      this.loadSiteDependent(this.form.siteId);
      if (this.form.buildingId) this.loadFloors(this.form.buildingId);
      if (this.form.locationType === 'meeting_room' && this.form.floorId) {
        this.vms.getMeetingRooms(this.form.floorId).subscribe({
          next: (res: any) => { this.meetingRoomOptions = (res?.data || []).map((m: any) => ({ id: m.id, name: m.name })); },
          error: () => {},
        });
      }
    }
    this.modalOpen = true;
  }

  closeModal() { this.modalOpen = false; }

  submitForm() {
    if (!this.validateForm()) {
      this.common.presentToast('Please fill all required fields', 'danger');
      return;
    }

    const payload: any = {
      visitorName: this.form.visitorName,
      visitorEmail: this.form.visitorEmail,
      visitorCompany: this.form.visitorCompany,
      visitorPhone: this.form.visitorPhone,
      visitorTypeId: this.form.visitorTypeId || null,
      hostId: this.form.hostId,
      siteId: this.form.siteId,
      buildingId: this.form.buildingId,
      visitDateTime: new Date(this.form.visitDateTime).toISOString(),
      visitDuration: Number(this.form.visitDuration) || 60,
      purpose: this.form.purpose,
      customMessage: this.form.customMessage,
      additionalInstructions: this.form.additionalInstructions,
      sendEmail: !!this.form.sendEmail,
      includeCalendar: !!this.form.includeCalendar,
    };

    // only send sub-location ids when actually chosen (API rejects null)
    if (this.form.floorId) payload.floorId = this.form.floorId;
    if (this.form.parkingZoneId) payload.parkingZoneId = this.form.parkingZoneId;
    if (this.form.meetingRoomId) payload.meetingRoomId = this.form.meetingRoomId;

    this.submitting = true;
    const obs = this.modalMode === 'create'
      ? this.vms.createInvite(payload)
      : this.vms.updateInvite(this.editingId!, payload);

    obs.subscribe({
      next: () => {
        const msg = this.modalMode === 'create' ? 'Invite created' : 'Invite updated';
        this.common.presentToast(msg, 'success');
        this.submitting = false;
        this.closeModal();
        this.loadInvites();
      },
      error: (err) => {
        this.submitting = false;
        this.common.presentToast(err?.error?.message || 'Failed to save invite', 'danger');
      },
    });
  }

  validateForm(): boolean {
    const f = this.form;
    const base = !!(f.visitorName && f.visitorEmail && f.hostId && f.siteId &&
              f.buildingId && f.visitDateTime && f.purpose);
    if (!base) return false;
    if (f.visitorPhone && !this.phoneValid) return false;
    if (f.locationType === 'floor' && !f.floorId) return false;
    if (f.locationType === 'parking' && !f.parkingZoneId) return false;
    if (f.locationType === 'meeting_room' && (!f.floorId || !f.meetingRoomId)) return false;
    return true;
  }

  async confirmDelete(invite: any) {
    const a = await this.alertCtrl.create({
      mode: 'ios',
      header: 'Delete Invite',
      message: `Delete invite for ${invite.visitor_name}? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteInvite(invite.id) },
      ],
    });
    await a.present();
  }

  deleteInvite(id: number) {
    this.vms.deleteInvite(id).subscribe({
      next: () => {
        this.common.presentToast('Invite deleted successfully', 'success');
        this.invites = this.invites.filter(i => i.id !== id);
        this.applyClientFilter();
      },
      error: (err) => {
        this.common.presentToast(err?.error?.message || 'Failed to delete', 'danger');
      },
    });
  }

  resend(invite: any) {
    this.vms.resendInvite(invite.id).subscribe({
      next: () => this.common.presentToast('Invite resent', 'success'),
      error: (err) => this.common.presentToast(err?.error?.message || 'Failed to resend', 'danger'),
    });
  }

  async cancelInvite(invite: any) {
    const a = await this.alertCtrl.create({
      mode: 'ios',
      header: 'Cancel Invite',
      message: `Cancel invite for ${invite.visitor_name}?`,
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Cancel Invite',
          role: 'destructive',
          handler: () => {
            this.vms.cancelInvite(invite.id).subscribe({
              next: () => {
                this.common.presentToast('Invite cancelled', 'success');
                this.loadInvites();
              },
              error: (err) => {
                this.common.presentToast(err?.error?.message || 'Failed to cancel', 'danger');
              },
            });
          },
        },
      ],
    });
    await a.present();
  }

  private lastDayTapAt = 0;

  openDatePicker() {
    this.lastDayTapAt = 0;
    this.dtPickerOpen = true;
  }

  // Reliable double-tap detection (native dblclick is unreliable on touch
  // devices). When the user taps the SAME calendar day twice within 450ms,
  // auto-select that date and close the picker — no Done press needed.
  onDatetimeTap(ev: Event, dt: any) {
    const path: any[] = (ev as any).composedPath ? (ev as any).composedPath() : [];
    const onDay = path.some((el: any) => el?.classList?.contains?.('calendar-day'));
    if (!onDay) {
      this.lastDayTapAt = 0;
      return;
    }
    const now = Date.now();
    if (now - this.lastDayTapAt > 0 && now - this.lastDayTapAt < 450) {
      this.lastDayTapAt = 0;
      this.confirmDatePick(dt);
    } else {
      this.lastDayTapAt = now;
    }
  }

  // Confirms the currently highlighted date/time and closes the picker.
  // Triggered by the Done button or by a double-tap on a calendar date.
  async confirmDatePick(dt: any) {
    try {
      await dt?.confirm?.(true);
    } catch {}
    this.dtPickerOpen = false;
  }

  showQR(invite: any) {
    this.qrInvite = invite;
    this.qrOpen = true;
  }

  closeQR() { this.qrOpen = false; }

  qrImageUrl(): string {
    const code = this.qrInvite?.qr_code || '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(code)}`;
  }

  suggestPurpose() {
    const desc = (this.form.purpose || this.form.customMessage || 'Business meeting').toString();
    this.vms.suggestPurposeAI(desc).subscribe({
      next: (res: any) => {
        if (res?.purpose) {
          this.form.purpose = res.purpose;
          this.common.presentToast('AI suggestion added', 'success');
        } else {
          this.common.presentToast('No suggestion returned', 'warning');
        }
      },
      error: (err: any) => this.common.presentToast(err?.error?.message || 'AI suggestion failed', 'danger'),
    });
  }

  trackById = (_: number, item: any) => item?.id;

  visitorInitials(name: string): string { return this.getInitials(name); }

  formatDateTime(dt: string): string {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  }

  statusClass(status: string): string {
    const map: any = {
      sent: 'chip-blue',
      checked_in: 'chip-green',
      checked_out: 'chip-grey',
      cancelled: 'chip-red',
      pending: 'chip-yellow',
    };
    return map[status] || 'chip-grey';
  }

  statusLabel(status: string): string {
    if (!status) return '—';
    return status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  isCancelled(invite: any): boolean { return invite?.status === 'cancelled'; }
  isCheckedIn(invite: any): boolean { return invite?.status === 'checked_in'; }
  isCheckedOut(invite: any): boolean { return invite?.status === 'checked_out'; }
  hasEmailSent(invite: any): boolean { return !!invite?.email_sent_at; }
  hasFacePhoto(invite: any): boolean {
    return typeof invite?.face_photo === 'string' && invite.face_photo.length > 0;
  }

  async confirmCheckout(invite: any) {
    const a = await this.alertCtrl.create({
      mode: 'ios',
      header: 'Check out visitor?',
      message: `Mark ${invite.visitor_name} as checked out. They will receive an email confirming they were checked out by the host.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Check out',
          handler: () => this.checkoutInvite(invite.id),
        },
      ],
    });
    await a.present();
  }

  checkoutInvite(id: number) {
    this.vms.checkoutInvite(id).subscribe({
      next: (res: any) => {
        this.common.presentToast(res?.message || 'Visitor checked out successfully', 'success');
        this.loadInvites();
      },
      error: (err) => {
        this.common.presentToast(err?.error?.message || 'Failed to check out', 'danger');
      },
    });
  }

  private emptyForm() {
    return {
      visitorName: '',
      visitorEmail: '',
      visitorCompany: '',
      visitorPhone: '',
      visitorTypeId: '',
      hostId: '',
      siteId: '',
      buildingId: '',
      locationType: '',
      floorId: '',
      parkingZoneId: '',
      meetingRoomId: '',
      visitDateTime: '',
      visitDuration: 60,
      purpose: '',
      customMessage: '',
      additionalInstructions: '',
      sendEmail: true,
      includeCalendar: true,
    };
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) || '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase() || '?';
  }

  private refreshLookups() {
    const hosts = new Map<any, { name: string; email?: string }>();
    const sites = new Map<any, string>();
    const buildings = new Map<any, string>();
    const types = new Map<any, string>();

    this.invites.forEach((i: any) => {
      if (i.host_id && i.host_name) hosts.set(i.host_id, { name: i.host_name, email: i.host_email });
      if (i.site_id && i.site_name) sites.set(i.site_id, i.site_name);
      if (i.building_id && i.building_name) buildings.set(i.building_id, i.building_name);
      if (i.visitor_type_id && i.visitor_type_name) types.set(i.visitor_type_id, i.visitor_type_name);
    });

    this.hostOptions = Array.from(hosts.entries()).map(([id, v]) => ({ id, name: v.name, email: v.email }));
    this.siteOptions = Array.from(sites.entries()).map(([id, name]) => ({ id, name }));
    this.buildingOptions = Array.from(buildings.entries()).map(([id, name]) => ({ id, name }));
    this.visitorTypeOptions = Array.from(types.entries()).map(([id, name]) => ({ id, name }));
  }
}
