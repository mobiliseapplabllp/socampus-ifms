// ============================================================================
// Space Management — DUMMY DATA (backend ready hone tak)
// Response ka shape bilkul FMS API jaisa hai, taaki page me kuchh na badalna pade.
// Backend live hone par: space-mgt.service.ts me USE_DUMMY = false, aur ye file delete.
// ============================================================================

// Dummy me ki gayi bookings yahin yaad rehti hain (app reload par clear),
// taaki book ki hui chair dobara "Taken" dikhe aur flow asli jaisa lage.
const bookedArr: any[] = [];
let nextBookingId = 5001;

// ---------------- SSO ----------------

export function dummyInitiate() {
  return {
    status: true,
    token: 'dummy-sso-handoff-token',
    redirect_url: 'https://fms.onmobilise.com/sso/embassy'
  };
}

export function dummyValidate() {
  return {
    status: true,
    msg: 'SSO sign-in successful',
    data: {
      token: 'dummy-fms-token',
      user: {
        id: 2,
        username: 'tenantadmin',
        name: 'Mobilise',
        lname: 'Admin',
        email: 'demo@example.com',
        role: 'tenant_admin',
        tenant_id: 1,
        tenant_name: 'Mobilise Demo Campus',
        organisation_id: 1,
        organisation_name: 'Default',
        department_id: 3,
        department_name: 'Facility Management'
      }
    }
  };
}

// ---------------- Sites ----------------

export function dummySites() {
  return {
    status: true,
    msg: 'OK',
    data: {
      data: [
        { id: 1, tenant_id: 1, organisation_id: 1, name: 'Bangalore HQ', code: 'BLR-HQ', address: 'Whitefield, Bangalore, KA', timezone: 'Asia/Kolkata', status: 1 },
        { id: 67, tenant_id: 1, organisation_id: 1, name: 'Wipro', code: 'Wp-1', address: 'bangalore', timezone: null, status: 1 },
        { id: 72, tenant_id: 1, organisation_id: 1, name: 'Delhi Office', code: 'DEL-01', address: 'Connaught Place, New Delhi', timezone: 'Asia/Kolkata', status: 1 }
      ],
      total: 3,
      current_page: 1,
      per_page: 100
    }
  };
}

// ---------------- Facilities ----------------

// Har day ke liye operating hours (0 = Sunday). Sunday band.
function hours(open: string, close: string, slot: number) {
  const arr = [];
  for (let d = 1; d <= 6; d++) {
    arr.push({ day_of_week: d, open_time: open + ':00', close_time: close + ':00', slot_minutes: slot });
  }
  return arr;
}

// layout_json string me aata hai, page JSON.parse karta hai
function chairs(prefix: string, count: number) {
  const objects = [];
  for (let i = 1; i <= count; i++) {
    const no = ('0' + i).slice(-2);
    objects.push({ type: 'chair', id: prefix + '-D' + no, label: prefix + '-D' + no });
  }
  objects.push({ type: 'table', id: prefix + '-T01', label: 'Table' });
  return JSON.stringify({ objects: objects });
}

const facilityArr: any[] = [
  {
    id: 1415, site_id: 1, name: 'Meeting Room — Orion', type: 'Meeting Room', capacity: 6,
    location: 'Tower A, 3rd Floor', description: 'TV screen, whiteboard, video conferencing',
    min_advance_minutes: 15, max_advance_days: 15, max_per_user_per_day: 2, max_per_user_per_week: 5,
    operating_hours: hours('09:00', '19:00', 30), layout_json: chairs('ORN', 6), pantry: true
  },
  {
    id: 2070, site_id: 1, name: 'Conference Hall — Nova', type: 'Conference Hall', capacity: 12,
    location: 'Tower B, Ground Floor', description: 'Projector, mic system, seating for 12',
    min_advance_minutes: 30, max_advance_days: 30, max_per_user_per_day: 1,
    operating_hours: hours('08:00', '20:00', 60), layout_json: chairs('NOV', 12), pantry: true
  },
  {
    id: 2101, site_id: 1, name: 'Hot Desk Zone', type: 'Workstation', capacity: 8,
    location: 'Tower A, 5th Floor', description: 'Open seating with power and LAN',
    min_advance_minutes: 0, max_advance_days: 7, max_per_user_per_day: 1,
    operating_hours: hours('08:00', '22:00', 60), layout_json: chairs('HD', 8), pantry: false
  },
  {
    // Is par chair layout nahi hai — bina chair wala flow test karne ke liye
    id: 2150, site_id: 1, name: 'Phone Booth 1', type: 'Phone Booth', capacity: 1,
    location: 'Tower A, 3rd Floor', description: 'Single person call booth',
    min_advance_minutes: 0, max_advance_days: 3,
    operating_hours: hours('09:00', '18:00', 30), layout_json: '', pantry: false
  },
  {
    id: 3001, site_id: 67, name: 'Board Room', type: 'Meeting Room', capacity: 10,
    location: 'Main Block, 2nd Floor', description: 'Leadership meetings',
    min_advance_minutes: 60, max_advance_days: 15, max_per_user_per_week: 3,
    operating_hours: hours('10:00', '18:00', 60), layout_json: chairs('BRD', 10), pantry: true
  },
  {
    id: 3002, site_id: 67, name: 'Training Room', type: 'Training Room', capacity: 4,
    location: 'Main Block, 1st Floor', description: 'Small group sessions',
    min_advance_minutes: 15, max_advance_days: 10,
    operating_hours: hours('09:00', '17:00', 30), layout_json: chairs('TRN', 4), pantry: false
  }
  // site 72 (Delhi Office) par koi facility nahi — "No Facility Found" dekhne ke liye
];

function findFacility(id: any) {
  return facilityArr.find(dat => Number(dat.id) === Number(id));
}

export function dummyFacilities(siteId: any) {
  const list = facilityArr
    .filter(dat => Number(dat.site_id) === Number(siteId))
    .map(dat => ({ id: dat.id, name: dat.name, type: dat.type, capacity: dat.capacity, location: dat.location, description: dat.description }));
  return { status: true, msg: 'OK', data: { data: list, total: list.length, current_page: 1, per_page: 25 } };
}

export function dummyFacilityDetail(facilityId: any) {
  const row = findFacility(facilityId);
  return { status: true, msg: 'OK', data: row ? { ...row } : {} };
}

export function dummyPantryMenu(facilityId: any) {
  const row = findFacility(facilityId);
  if (!row || !row.pantry) { return { status: true, data: [] }; }
  return {
    status: true,
    data: [
      { id: 1, name: 'Tea', category: 'Beverages', price: 20 },
      { id: 2, name: 'Coffee', category: 'Beverages', price: 30 },
      { id: 3, name: 'Green Tea', category: 'Beverages', price: 25 },
      { id: 4, name: 'Veg Sandwich', category: 'Snacks', price: 60 },
      { id: 5, name: 'Cookies', category: 'Snacks', price: 0 }
    ]
  };
}

export function dummyMealTimes() {
  return {
    status: true,
    data: [
      { id: 1, name: 'Breakfast', start_time: '08:00', end_time: '10:00' },
      { id: 2, name: 'Lunch', start_time: '12:30', end_time: '14:30' },
      { id: 3, name: 'Evening Snacks', start_time: '16:30', end_time: '17:30' }
    ]
  };
}

// ---------------- Slots / availability ----------------

function toMin(time: string) {
  const t = (time || '').split(':');
  return Number(t[0]) * 60 + Number(t[1] || 0);
}

function toTime(min: number) {
  return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
}

function allChairs(row: any): string[] {
  try {
    const layout = JSON.parse(row.layout_json || '{}');
    return (layout.objects || []).filter((dat: any) => dat.type === 'chair').map((dat: any) => dat.id);
  } catch (e) {
    return [];
  }
}

// Kuchh chairs "pahle se booked" dikhane ke liye — date + slot se fix nikalte hain,
// taaki har baar same slot par same chairs taken aayen.
function seedTaken(row: any, date: string, start: string): string[] {
  const ids = allChairs(row);
  const total = ids.length || row.capacity || 1;
  const seed = (Number(date.replace(/-/g, '')) + toMin(start) + Number(row.id)) % 7;
  // seed 0 = slot full, baaki me 0 se 3 seats taken
  const count = seed === 0 ? total : Math.min(seed % 4, total);
  if (!ids.length) { return new Array(count).fill('X'); }
  return ids.slice(total - count);
}

// Seed wali + dummy me ki gayi bookings — dono milakar taken chairs
function takenFor(row: any, startAt: string, endAt: string): string[] {
  const date = startAt.substring(0, 10);
  const start = startAt.substring(11, 16);
  const taken = seedTaken(row, date, start).slice();
  bookedArr
    .filter(bk => Number(bk.facility_id) === Number(row.id) && bk.start_at < endAt && bk.end_at > startAt)
    .forEach(bk => {
      (bk.desks.length ? bk.desks : ['X']).forEach((id: string) => {
        if (taken.indexOf(id) === -1 || id === 'X') { taken.push(id); }
      });
    });
  return taken;
}

export function dummyDaySlots(facilityId: any, date: string, attendees: any) {
  const row = findFacility(facilityId);
  if (!row) { return { status: true, data: { capacity: 0, slots: [] } }; }
  const day = new Date(date + 'T00:00:00').getDay();
  const oh = (row.operating_hours || []).find((dat: any) => Number(dat.day_of_week) === day);
  if (!oh) { return { status: true, data: { capacity: row.capacity, slots: [] } }; }

  const slots = [];
  const step = Number(oh.slot_minutes) || 30;
  for (let m = toMin(oh.open_time); m + step <= toMin(oh.close_time); m += step) {
    const start = toTime(m);
    const end = toTime(m + step);
    const taken = takenFor(row, date + ' ' + start + ':00', date + ' ' + end + ':00').length;
    const remaining = Math.max(row.capacity - taken, 0);
    slots.push({ start: start, end: end, seats_remaining: remaining, conflict: remaining < Number(attendees || 1) });
  }
  return { status: true, data: { capacity: row.capacity, slots: slots } };
}

export function dummyCheck(facilityId: any, startAt: string, endAt: string, attendees: any) {
  const row = findFacility(facilityId);
  if (!row) { return { status: true, data: { conflict: true, reason: 'Facility not found' } }; }
  const taken = takenFor(row, startAt, endAt);
  const remaining = Math.max(row.capacity - taken.length, 0);
  const conflict = remaining < Number(attendees || 1);
  return {
    status: true,
    data: {
      capacity: row.capacity,
      seats_taken: taken.length,
      seats_remaining: remaining,
      occupied_desks: taken.filter(id => id !== 'X'),
      conflict: conflict,
      reason: conflict ? 'Not enough seats free in this slot' : ''
    }
  };
}

// ---------------- Booking ----------------

export function dummyCreateBooking(data: any) {
  const row = findFacility(data.facility_id);
  if (!row) { return { status: false, msg: 'Facility not found' }; }
  const desks = [data.desk_id, ...(data.guests || []).map((dat: any) => dat.desk_id)].filter(Boolean);
  const taken = takenFor(row, data.start_at, data.end_at);
  const clash = desks.find(id => taken.indexOf(id) > -1);
  if (clash) { return { status: false, msg: 'Chair ' + clash + ' was just booked by someone else' }; }
  if (!desks.length && taken.length >= row.capacity) { return { status: false, msg: 'This slot is full' }; }

  const id = nextBookingId++;
  bookedArr.push({ id: id, facility_id: row.id, start_at: data.start_at, end_at: data.end_at, desks: desks });
  return { status: true, msg: 'Booking created', data: { id: id } };
}
