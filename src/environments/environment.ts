// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
// https://industry-043739c72da7.herokuapp.com/
// https://mobileapproxyprod.mobilisepro.com
export const environment = {
  production: false,
  // url: 'https://mobileapproxyprod.mobilisepro.com/https://socampusstaging.mobilisepro.com/be/api/',
  // url1: 'https://mobileapproxyprod.mobilisepro.com/https://socampusstaging.mobilisepro.com/',
  // url2: 'https://socampusstaging.mobilisepro.com/',
  // ssoUrl: 'https://socampusstaging.mobilisepro.com/',
  // liveLocationUrl: 'https://socampusstaging.mobilisepro.com/be/api/gps-mobile/ping',
  // referUrl: 'https://socampusstaging.mobilisepro.com/',
  // isProd: false,
  // url: 'https://mobileapproxyprod.mobilisepro.com/https://socampus.mobilisepro.com/be/api/',
  // url1: 'https://mobileapproxyprod.mobilisepro.com/https://socampus.mobilisepro.com/',
  // url2: 'https://socampus.mobilisepro.com/',
  // ssoUrl: 'https://socampus.mobilisepro.com/',
  // referUrl: 'https://socampus.mobilisepro.com/',
  // liveLocationUrl: 'https://socampus.mobilisepro.com/be/api/gps-mobile/ping',
  // isProd: true,  
  url: 'https://socampusifms.mobilisepro.com/be/api/', // ios k liye abhi proxy server lagega
  url1: 'https://socampusifms.mobilisepro.com/',
  url2: 'https://socampusifms.mobilisepro.com/',
  ssoUrl: 'https://socampusifms.mobilisepro.com/',
  referUrl: 'https://socampusifms.mobilisepro.com/',
  liveLocationUrl: 'https://socampusifms.mobilisepro.com/be/api/gps-mobile/ping',
  isProd: false,  
  // url: 'https://mobileapproxyprod.mobilisepro.com/https://socampusdev.mobilisepro.com/be/api/', // ios k liye abhi proxy server lagega
  // url1: 'https://mobileapproxyprod.mobilisepro.com/https://socampusdev.mobilisepro.com/',
  // url2: 'https://socampusdev.mobilisepro.com/',
  // ssoUrl: 'https://socampusdev.mobilisepro.com/',
  // referUrl: 'https://socampusdev.mobilisepro.com/',
  // liveLocationUrl: 'https://socampusdev.mobilisepro.com/be/api/gps-mobile/ping',
  // isProd: false,  
  // url: 'https://apac-ad81b25ce966.herokuapp.com/https://socampusdev.mobilisepro.com/be/api/',
  // url1: 'https://apac-ad81b25ce966.herokuapp.com/https://socampusdev.mobilisepro.com/',
  // url2: 'https://socampusdev.mobilisepro.com/',
  // ssoUrl: 'https://socampusdev.mobilisepro.com/',
  // referUrl: 'https://socampusdev.mobilisepro.com/',
  // isProd: false,    
  db: 'socampuseng.db',
  db_location: 'default',
  // Space Management (FMS) — sso/initiate ke baad saari space APIs yahan jaati hain (token2)
  fmsUrl: 'https://fms.onmobilise.com/',
  // fmsUrl: 'https://fmsdev.onmobilise.com/',
  errMsg: 'Internal Server Error Please try again!!!',
  source: 'Mobile',
  LARAVEL_KEY: '8+Fjns9RCg2HJfhHCirTe6FE3NCHSq+W3014tuKBZH4=',
  aiStudioUrl: 'https://apisuite-aistudio.onmobilise.com/v1/',
  // VMS (Atithi) - visitor management APIs
  vmsUrl: 'https://atithidev.onmobilise.com/api',
  vmsPortalUrl: 'https://atithi.onmobilise.com',
  // Mail Room Management API base, e.g. 'https://mailroom.example.com/api/v1'.
  // Khaali chhodne par base `sso/mailroom` ke url ke origin se banta hai (origin + '/api/v1').
  mailroomUrl: '',
  // sirf browser ke liye - native CapacitorHttp seedha aiStudioUrl par jaata hai
  aiStudioWebProxy: 'http://0.0.0.0:8080/',
  aiStudioEnv: 'UAT',
  aiStudioKey: 'sk_uat_563438c3bbc50ee36bf2102360e8d9f2ee3df435123f75e3a9c0e7e8f7208afd'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
