# API Endpoints — IFMS Service (`src/app/provider`)

> Sabhi endpoints `environment.url` (base URL) ke saath append hote hain.

## Base URLs (`src/environments/environment.ts`)

| Key | Value |
|-----|-------|
| `url`  | `https://socampus.mobilisepro.com/be/api/` |
| `url1` | `https://socampus.mobilisepro.com/` |
| `url2` | `https://socampus.mobilisepro.com/` |

**Legend:** `{...}` = dynamic path param · `?param=` = query string · `*(legacy php)*` = purane PHP endpoint · `*(external)*` = third-party API.

---

## 🔐 login — `login/login.service.ts`

| Method | Endpoint |
|--------|----------|
| POST | `login_with_otp` |
| GET  | `ssoGatesLoginDetails` |
| POST | `verify_login_otp` |
| POST | `app_version` |
| GET  | `refresh` |
| POST | `logout` |
| GET  | `login_ping` |
| POST | `change_password_otp` |
| POST | `send_otp` |
| POST | `validate_otp` |
| POST | `complaints/app/get-fcm-push-notification-list` |

---

## 📋 list-master — `list-master/list-master.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `setups/app-menu/get_mobile_app_mnu?app=app` |
| GET  | `complaints/dash/mobile_app_engineer_dashboard` |
| GET  | `pmscal/getPmsCategoryCount` |
| GET  | `pmscal/getPmsActionableCount` |
| GET  | `pmscal/getPmsResponsibleCount` |
| GET  | `complaints/dash/statusCount` |
| POST | `concierge/users/save_user_punch` |

---

## 🎫 complaint — `complaint/complaint.service.ts`

| Method | Endpoint |
|--------|----------|
| POST | `complaints/reopen_tkt` |
| GET  | `get_emp_detail` |
| GET  | `complaints/get_all_ticket_stages` |
| GET  | `complaints/get_ticket_stages` |
| GET  | `search_internal_users?pc_id=` |
| POST | `complaints/helpdesk_ticket_on_hold` |
| GET  | `complaints/get_assign_ticket_master?...` |
| POST | `shared/location-qrcode-scan-get-details` |
| GET  | `complaints/app/get-helpdesk-graph?date=` |
| GET  | `complaints/app/get-digital-pms-meter-graph?date=&cate=&sub_cat_id=` |
| GET  | `complaints/getSpecificTicket/{ticket_id}` |
| POST | `complaints/change_ticket_priority` |
| POST | `complaints/submit_transaction` |
| GET  | `setups/teams/get_site_team_members/{pc_id}?with_gps=` |
| POST | `complaints/assigned_ticket` |
| GET  | `complaints/select_issue_type` |
| GET  | `complaints/select_tkt_req_type?issue_id=` |
| GET  | `complaints/select_category/{cat_id}` |
| GET  | `complaints/select_tkt_subcategory/{qry_id}` |
| GET  | `complaints/select_tkt_subcategory2/{qry_id1}` |
| GET  | `complaints/check_if_ticket_confirm?ticketId=` |
| POST | `complaints/add_ticket_action` |
| POST | `complaints/add_ticket_multiple_action` |
| POST | `shared/get-user-pc-code` |
| GET  | `shared/get_building_list/{id}` |
| GET  | `shared/get-floors-list/{id}` |
| GET  | `shared/get-locations-list/{id}` |
| GET  | `pmscal/category/get_category` |
| GET  | `complaints/getScopeOfWork` |
| POST | `complaints/get_client_asset_id_bar_code` |
| POST | `complaints/complaint_type_cfrm` |
| GET  | `complaints/get_distance_travel_type_info?tkts_id=` |
| POST | `complaints/send_res_otp` |
| POST | `complaints/verify_res_otp` |
| GET  | `complaints/getEfsrDetails/{ticket_id}` |
| GET  | `complaints/select_ticket_priority?ticket_id=` |
| POST | `complaints/downloadEfsrPDF` |
| POST | `complaints/save_travel_info` |
| GET  | `complaints/get_my_ticket_master?limit=10&page=&dateWise=loggedBy` |
| GET  | `assigned_ticket1.php` *(legacy php)* |
| GET  | `specific_ticket.php` *(legacy php)* |
| POST | `submit_ticket_transaction.php` *(legacy php)* |
| POST | `assign_emp_ticket.php` *(legacy php)* |
| GET  | `get_teams_mem.php` *(legacy php)* |
| GET  | `customer_send_otp.php` *(legacy php)* |
| GET  | `customer_verify_otp.php` *(legacy php)* |

---

## 📅 pm-cal — `pm-cal/pm-cal.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `pmscal/get_pms_ptw_logs/{id}` |
| GET  | `pmscal/get_ppm_work_area_work_order?...` |
| GET  | `pmscal/get_work_order_counts` |
| GET  | `pmscal/schedule/get_wo_categories/{cat_id}` |
| GET  | `pmscal/schedule/get_questions?wo_id=&cat_id=` |
| GET  | `pmscal/schedule/get_actionable_ques/{wo_id}` |
| GET  | `pmscal/schedule/get_schedule_questions/{wo_id}` |
| GET  | `pmscal/schedule/get_schedule_details_usr/{wo_id}` |
| POST | `pmscal/schedule/update_user_action` |
| POST | `pmscal/cancel_wo_action` |
| GET  | `verify_pms_barcode_sales.php?barcode_no=&schedule_id=` *(legacy php)* |
| GET  | `setups/teams/ppm/get_site_team_members?pc_id=` |
| GET  | `pmscal/schedule/get_assets/{wo_id}` |
| POST | `pmscal/assign_work_order_to_team` |
| GET  | `pmscal/get_pms_config?id=1` |
| GET  | `shared/get-user-pc-code` |
| GET  | `pmscal/checklist_dropdown` |
| POST | `pmscal/create_work_order_action` |
| GET  | `pmscal/get_My_work_order?limit=10&page=1` |
| POST | `pmscal/uploadVendorProof` |
| POST | `pmscal/uploadPTW` |
| GET  | `ppm_search_internal_users?pc_id=` |
| POST | `pmscal/ppm/ppm_work_order_on_hold` |
| POST | `update_pm_callibration_status.php` *(legacy php)* |
| GET  | `pmsMainCategory.php` *(legacy php)* |
| GET  | `pmsCategoryQuestion.php?category_id=&loggedin_user=&work_order_id=` *(legacy php)* |
| POST | `pmscal/schedule/schedule_response_action` |
| POST | `pmscal/schedule/schedule_response_action_rem` |
| POST | `pmscal/schedule/schedule_response_action_doc` |
| POST | `pmscal/schedule/chklist_catgry_status` |
| POST | `pmscal/schedule/update_chklist_asset` |
| POST | `pmscal/schedule/update_schedule_status` |
| GET  | `otherCategory.php` *(legacy php)* |
| POST | `saveOtherCategory.php` *(legacy php)* |
| POST | `final_pms_fill_report.php` *(legacy php)* |

---

## ✅ approval — `approval/approval.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `complaints/get_complaint_ptw_approvals` |
| POST | `complaints/complaint_ptw_approval_action` |
| GET  | `pmscal/get_pms_ptw_approvals` |
| POST | `pmscal/pms_ptw_approval_action` |
| GET  | `complaints/get_helpdesk_on_hold_tickets_list` |
| POST | `complaints/helpdesk_on_hold_approval_action` |
| GET  | `pmscal/ppm/get_ppm_on_hold_work_order_list` |
| POST | `pmscal/ppm/ppm_on_hold_approval_action` |
| GET  | `get_approval_matrix_count` |
| GET  | `purchase/inventory/get_stock_adjust_approval` |
| GET  | `dashboard/get_approvals` |
| POST | `purchase/inventory/stock_adjust_approval_Action` |
| GET  | `purchase/inventory/get_stock_adjust_mtrl?order_no=` |
| POST | `dashboard/mr_approve_action` |

---

## 🛎️ concierge — `concierge/concierge.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `concierge/ticket/concierge_dash_count` |
| POST | `concierge/ticket/list` |
| POST | `concierge/ticket/get-specific-ticket` |
| POST | `concierge/ticket/ticket-status-change` |
| GET  | `concierge/ticket/get-ticket-scope-of-work` |
| POST | `concierge/ticket/ticket-reassign` |
| POST | `concierge/ticket/site-wise-category` |
| POST | `concierge/ticket/category-wise-subcategory` |
| POST | `concierge/ticket/site-cate-wise-resolve-response-time` |
| POST | `concierge/ticket/create` |
| POST | `concierge/ticket/save_concierge_trip` |
| GET  | `concierge/ticket/get_trip_logs?ticket_id=&source=mobile` |

---

## 🕒 attendance — `attendance/attendance.service.ts`

| Method | Endpoint |
|--------|----------|
| POST | `shared/save-engineer-attendance` |
| GET  | `shared/get-engineer-attendance?month=&year=&pc_id=` |
| GET  | `shared/check-engineer-attendance?pc_id=` |

---

## 🍽️ meal-checkin — `meal-checkin/meal-checkin.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `meal/socampus/foodnyou?pc_id=&curr_datetime=` |
| GET  | `meal/socampus/locationmeals?pc_id=&loc_id=&curr_datetime=` |
| POST | `meal/engin/mealcheckin/{encryptionId}` |
| GET  | `shared/get-pc-locations/{pc_code}?/for=meal` |
| GET  | `meal/meal-type/get/dropdown?pc_id=` |
| GET  | `meal/roaster/list` |

---

## 📊 meter — `meter/meter.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `meter/meter-type` |
| GET  | `meter/meter-type-all?pc_id=` |
| GET  | `meter/meter-uom-all` |
| GET  | `meter/meter-pc-wise-users/{pc_id}` |
| POST | `meter/add-meter` |
| GET  | `meter/ifms/get-pending-work-order` |
| GET  | *(dynamic url passed in)* |
| POST | `meter/ifms/add-reading` |
| GET  | `meter/ifms/get-complete-work-order?date=` |

---

## 📦 indents — `indents/indents.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `setups/organisation/get_warehouse_by_pc?pc_id=` |
| GET  | `purchase/settings/select_type` |
| GET  | `purchase/settings/get_indent_material_by_pc?org_id=&type=&pc_id=` |
| GET  | `search_emp_by_id/{username}` |
| GET  | `purchase/settings/select_uom` |
| POST | `purchase/mtrl_request/add_mtrl_request` |
| GET  | `purchase/mtrl_request/get_edit_mtrl_request/{id}` |
| POST | `purchase/mtrl_request/edit_mtrl_request` |
| GET  | `complaints/get_tkt_trans/{id}` |
| GET  | `purchase/mtrl_request/get_mtrl_request_master?...&for=forPpm&wo_id=` |
| GET  | `purchase/settings/select_material` |
| GET  | `get_item_master.php` *(legacy php)* |
| POST | `emp_search` |
| GET  | `purchase/mtrl_request/get_mtrl_request_master?...` |
| POST | `purchase/mtrl_request/cancel_mtrl_request` |
| GET  | `purchase/mtrl_request/cntr_indnt_data_logs?...&rqst_id=` |
| GET  | `shared/get-users-list-pc-wise?pc_id=` |

---

## 🏭 my-asset-get — `my-asset-get/my-asset-get.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `assets/reporting/assetMasterData?systemDateTime=` |
| POST | `shared/get-dectext` |
| GET  | `get_pc_cate` |
| GET  | `get_plants_by_cat/{id}` |
| GET  | `shared/get_blocks_list/{id}` |
| GET  | `shared/get-pc-code-prefix/{id}` |
| GET  | `setups/organisation/get_buildings_list/{id}` |
| GET  | `assets/settings/get_building?status=1` |
| GET  | `shared/get-floors-list/{id}` |
| GET  | `assets/settings/get_floor?status=1` |
| GET  | `shared/get-locations-list/{floor_id}` |
| GET  | `assets/settings/get_department?status=1` |
| GET  | `assets/settings/get_sub_department?status=1&department=` |
| GET  | `assets/settings/sel_asset_group` |
| GET  | `assets/settings/sel_asset_subgroup/{id}` |
| GET  | `assets/settings/get_manufacturer?status=1` |
| GET  | `assets/settings/sel_ownership` |
| GET  | `assets/settings/dropdown_for_asset_status` |
| GET  | `assets/settings/sel_technology` |
| GET  | `assets/settings/get_warranty?status=1` |
| POST | `assets/reporting/add_assets_action` |
| POST | `assets/reporting/get_asset_parent_id_details` |

---

## 📖 manuals — `manuals/manuals.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `setups/master-data/manual-master` |
| GET  | `setups/master-data/health-safety-cat-dropdown` |
| GET  | `setups/master-data/health-safety-master` |

---

## 📝 digital-checklist — `digital-checklist/digital-checklist.service.ts`

| Method | Endpoint |
|--------|----------|
| GET  | `digicheck/offlineapp/getAllPendingChecklist?date=&paginate=1&limit=300&offset=` |
| GET  | `digicheck/get_scheduled_calender?limit=10&page=1` |
| GET  | `digicheck/get_scheduled_calender?date=` |
| POST | `digicheck/verifyAssetDcByQr` |
| GET  | `digicheck/get_scheduled_calender?qr_loc_id=&on_behalf=1` |
| GET  | `digicheck/get_schedule_questions/{schedule_id}` |
| POST | `digicheck/schedule_response_action` |
| POST | `digicheck/schedule_response_action_rem` |
| POST | `digicheck/schedule_response_action_doc` |
| POST | `digicheck/offlineapp/saveAllPendingChecklist` |
| POST | `digicheck/update_raised_issued_schudled` |
| POST | `https://translate.googleapis.com/language/translate/v2` *(external — Google Translate)* |

---

## ⚙️ common — `common/common.service.ts`

| Method | Endpoint |
|--------|----------|
| POST | `blob-url` |
| GET  | `{url1}img/px.gif` *(network reachability check)* |

---

## ℹ️ No remote API

- **camera** — `camera/camera.service.ts`: sirf device camera, koi API nahi.
- **local-db** — `local-db/local-db.service.ts`: local SQLite/storage, koi remote API nahi.
