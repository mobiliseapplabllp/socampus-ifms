# Order Packing — API Change (Frontend → Backend)

## Summary

Pehle order packing **har step pe alag-alag API call** karke save hoti thi
(per-cambro, per-temperature, phir finalize). Ab packing app me **locally collect**
hoti hai aur **sirf ek hi API call** me poora data jaata hai.

> **Backend ko sirf ek endpoint badalna hai:** `POST meal/order/order_packed_`

---

## Data source (lineage)

Packing screen 3 GET APIs se data load karta hai; payload ke saare fields inhi se bante hain:

| Source API | Kya deta hai |
|---|---|
| `GET meal/order/get_order_history?order_id=` | Order ke items/recipes — `txn_id`, `item_id`, `order_qty`, `ttl_left_portion` (remaining), `uom` |
| `GET assets/reporting/get_cambro_by_pc?pc_id=&group_id=39` | Available cambro list — `cambro_id`, `ext_asset_id` (QR no), `size` |
| `GET meal/order/select_pack_type` | Asset types — `value`, `label` (Aluminum Handi=2, SS Tray=3, Cambro Box=39, Ice Box=84, Silver Pouch=87) |
| `/barcode` scan + user input | Cambro QR scan, temperature (per item), non-cambro identify key |

---

# 🔴 PURANA PROCESS (3 endpoints, bahut saari calls)

### 1. Har pack pe (jitne cambro/asset, utni calls)
`POST meal/order/updte_order_recipe_packing_qty`
```json
{
  "dispatch_qty": 100,
  "item_id": 7638,
  "order_id": 148034,
  "txn_id": 47925,
  "pack_no": "1008347809",
  "pack_type": "0",
  "camro_box_id": 813
}
```

### 2. Har item ki temperature pe (per item call)
`POST meal/order/updte_order_recipe_temp`
```json
{ "temperature": 10, "txn_id": 47925 }
```

### 3. Aakhir me "Pack" button pe (finalize)
`POST meal/order/order_packed_`
```json
[ { "order_id": 148034 } ]
```

> Ek order = N pack calls + M temperature calls + 1 finalize call.

---

# 🟢 NAYA PROCESS (sab kuch ek hi call me)

Packing/temperature ke time **koi API call nahi** — sab local. Sirf "Pack" button pe **ek call**:

`POST meal/order/order_packed_`

```json
{
  "order_id": 148034,
  "items": [
    {
      "txn_id": 47926,
      "item_id": 7637,
      "temperature": "10",
      "packs": [
        { "dispatch_qty": 800, "pack_no": "iden 1", "pack_type": "1", "camro_box_id": 2 }
      ]
    },
    {
      "txn_id": 47925,
      "item_id": 7638,
      "temperature": "10",
      "packs": [
        { "dispatch_qty": 100, "pack_no": "1008347809", "pack_type": "0", "camro_box_id": 813 },
        { "dispatch_qty": 100, "pack_no": "1008123212", "pack_type": "0", "camro_box_id": 812 },
        { "dispatch_qty": 300, "pack_no": "2",          "pack_type": "1", "camro_box_id": 2 }
      ]
    },
    {
      "txn_id": 47924,
      "item_id": 7639,
      "temperature": "10",
      "packs": []
    }
  ]
}
```

> Note: ek hi item me cambro + non-cambro dono packs ho sakte hain (upar item 7638 dekho).
> Jis item me na pack ho na temperature, woh payload me nahi aayega.

---

## Har key ka description + source

### Top level
| Key | Meaning | Source |
|---|---|---|
| `order_id` | Kis order ki packing | Page kholte waqt navigation se (mool: order list) |
| `items[]` | Har order item (recipe) ka object | `get_order_history` ke items par bana |

### `items[]`
| Key | Meaning | Source |
|---|---|---|
| `txn_id` | Recipe row transaction id | `get_order_history` → `txn_data[].txn_id` |
| `item_id` | Item/recipe id | `get_order_history` → `txn_data[].item_id` |
| `temperature` | Item temperature (string/number, khaali bhi ho sakti) | **User input** (range −20…100) |
| `packs[]` | Us item ke saare packs | Packing ke dauraan locally collect |

### `packs[]` — Cambro (`pack_type: "0"`)
| Key | Example | Source |
|---|---|---|
| `dispatch_qty` | `100` | **Auto** = `min(remaining, cambro size)`. remaining = `ttl_left_portion`; size = cambro `size` |
| `pack_no` | `"1008347809"` | Cambro ka **`ext_asset_id`** (scanned QR no) |
| `pack_type` | `"0"` | Constant (cambro) |
| `camro_box_id` | `813` | Cambro ka **`cambro_id`** (internal asset id) |

### `packs[]` — Non-cambro (`pack_type: "1"`) — Tray / Handi / Ice Box / Silver Pouch
| Key | Example | Source |
|---|---|---|
| `dispatch_qty` | `800` | Item ka poora **remaining** (`ttl_left_portion`) |
| `pack_no` | `"iden 1"` | **User input** — identify key |
| `pack_type` | `"1"` | Constant (non-cambro) |
| `camro_box_id` | `2` / `3` / `84` / `87` | Selected type ki **`value`** (`select_pack_type`) — Aluminum Handi=2, SS Tray=3, Ice Box=84, Silver Pouch=87 |

---

## Backend ko kya karna hai

1. `order_packed_` ka body **array `[{order_id}]` → object `{ order_id, items: [...] }`** accept karna.
2. Har `item` ke liye:
   - `temperature` save (purana `updte_order_recipe_temp` jaisa logic, ab body se).
   - `packs[]` loop karke har pack save (purana `updte_order_recipe_packing_qty` jaisa logic, ab body se).
   - Phir order ko **packed** mark karna (purana finalize logic).
3. Purane `updte_order_recipe_packing_qty` aur `updte_order_recipe_temp` ki ab app me zaroorat nahi (rehne do/hata do — app call nahi karega).

### Validation suggestions (backend pe bhi rakhna behtar)
- Ek `camro_box_id` (cambro_id) ek order me **ek hi baar**.
- Kisi item ke packs ka total `dispatch_qty` us item ki ordered/remaining qty se zyada na ho.
- `pack_type` sirf `"0"` ya `"1"`.
