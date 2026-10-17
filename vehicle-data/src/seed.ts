import type { Body, CatalogSnapshot, Drive, Feature, Fuel, Localized, Specs } from './types.ts';

const L = (en: string, bn: string): Localized => ({ en, bn });
const toyota = 'https://toyota.jp/ucar/catalog/brand-TOYOTA/car-';
const hondaVezel = 'https://www.honda.co.jp/auto-archive/vezel/2018/common/pdf/vezel_spec_list.pdf';
const hondaGrace = 'https://www.honda.co.jp/auto-archive/grace/2020/common/pdf/grace_spec_list.pdf';
const nissan = 'https://history.nissan.co.jp/X-TRAIL/T32/1312/PDF/x-trail_specification.pdf';

const makes = [
  { id: 'toyota', name: L('Toyota', 'টয়োটা'), aliases: ['টয়োটা'], active: true },
  { id: 'honda', name: L('Honda', 'হোন্ডা'), aliases: ['হোন্ডা'], active: true },
  { id: 'nissan', name: L('Nissan', 'নিসান'), aliases: ['নিসান'], active: true },
];
const modelSeed: Array<[string, string, string, string, string[]]> = [
  ['axio', 'toyota', 'Corolla Axio', 'করোলা অ্যাক্সিও', ['Axio', 'অ্যাক্সিও']],
  ['allion', 'toyota', 'Allion', 'অ্যালিয়ন', []],
  ['premio', 'toyota', 'Premio', 'প্রেমিও', []],
  ['corolla', 'toyota', 'Corolla', 'করোলা', []],
  ['fielder', 'toyota', 'Corolla Fielder', 'করোলা ফিল্ডার', ['Fielder', 'ফিল্ডার']],
  ['noah', 'toyota', 'Noah', 'নোয়া', []],
  ['voxy', 'toyota', 'Voxy', 'ভক্সি', []],
  ['harrier', 'toyota', 'Harrier', 'হ্যারিয়ার', []],
  ['chr', 'toyota', 'C-HR', 'সি-এইচআর', ['CHR']],
  ['prado', 'toyota', 'Land Cruiser Prado', 'ল্যান্ড ক্রুজার প্রাডো', ['Prado', 'প্রাডো']],
  ['aqua', 'toyota', 'Aqua', 'অ্যাকুয়া', []],
  ['vezel', 'honda', 'Vezel', 'ভেজেল', []],
  ['grace', 'honda', 'Grace', 'গ্রেস', []],
  ['xtrail', 'nissan', 'X-Trail', 'এক্স-ট্রেইল', ['X Trail', 'Xtrail']],
];
const models = modelSeed.map(([id, makeId, en, bn, aliases]) => ({ id, makeId, name: L(en, bn), aliases, active: true }));

type Row = [string, string, string, string, string, number, Fuel, Body, Drive, number, string, string, string];
// Code, model, generation EN, generation BN, engine code, cc, fuel, body, drive,
// seats, grade EN, grade BN, primary manufacturer's source URL.
const rows: Row[] = [
  ['NZE161','axio','E160 1.5','ই১৬০ ১.৫','1NZ-FE',1496,'petrol','sedan','fwd',5,'1.5 X','১.৫ এক্স',toyota+'COROLLA_AXIO/'],
  ['NZT260','allion','T260 1.5','টি২৬০ ১.৫','1NZ-FE',1496,'petrol','sedan','fwd',5,'A15','এ১৫',toyota+'ALLION/'],
  ['NZT260','premio','T260 1.5','টি২৬০ ১.৫','1NZ-FE',1496,'petrol','sedan','fwd',5,'1.5 F','১.৫ এফ',toyota+'PREMIO/'],
  ['ZRE212','corolla','E210 1.8','ই২১০ ১.৮','2ZR-FAE',1797,'petrol','sedan','fwd',5,'Grade not listed','গ্রেড তালিকাভুক্ত নয়',toyota+'COROLLA/'],
  ['NKE165G','fielder','E160 Hybrid','ই১৬০ হাইব্রিড','1NZ-FXE',1496,'hybrid','wagon','fwd',5,'Hybrid EX','হাইব্রিড ইএক্স',toyota+'COROLLA_FIELDER/'],
  ['ZRR80G','noah','R80 2.0','আর৮০ ২.০','3ZR-FAE',1986,'petrol','microbus','fwd',8,'G','জি',toyota+'NOAH/'],
  ['ZRR80W','voxy','R80 2.0','আর৮০ ২.০','3ZR-FAE',1986,'petrol','microbus','fwd',8,'ZS','জেডএস',toyota+'VOXY/'],
  ['ZSU60W','harrier','XU60 2.0','এক্সইউ৬০ ২.০','3ZR-FAE',1986,'petrol','suv','fwd',5,'Premium','প্রিমিয়াম',toyota+'HARRIER/'],
  ['ZYX10','chr','AX10 Hybrid','এএক্স১০ হাইব্রিড','2ZR-FXE',1797,'hybrid','suv','fwd',5,'G','জি',toyota+'CHR/'],
  ['TRJ150W','prado','J150 2.7','জে১৫০ ২.৭','2TR-FE',2693,'petrol','suv','4wd',7,'TX','টিএক্স',toyota+'LAND_CRUISER_PRADO/'],
  ['NHP10','aqua','P10 Hybrid','পি১০ হাইব্রিড','1NZ-FXE',1496,'hybrid','hatchback','fwd',5,'X-Urban','এক্স-আরবান',toyota+'AQUA/'],
  ['RU3','vezel','First generation Hybrid','প্রথম প্রজন্ম হাইব্রিড','LEB',1496,'hybrid','suv','fwd',5,'Hybrid Z','হাইব্রিড জেড',hondaVezel],
  ['GM4','grace','First generation Hybrid','প্রথম প্রজন্ম হাইব্রিড','LEB',1496,'hybrid','sedan','fwd',5,'Hybrid EX','হাইব্রিড ইএক্স',hondaGrace],
  ['T32','xtrail','T32 2.0','টি৩২ ২.০','MR20DD',1997,'petrol','suv','fwd',5,'20X','২০এক্স',nissan],
];
const generations = rows.map(([code,modelId,en,bn,engineCode,engineCc,fuel,body,drive,seats,,,sourceUrl]) => ({
  id: `${modelId}-${code.toLowerCase()}`, modelId, name: L(en,bn), yearStart: null, yearEnd: null,
  chassis: [{ code, engineCode, sourceUrl }],
  // Honda's RU3 and GM4 hybrids use 7-speed dual-clutch gearboxes.
  specs: { body, engineCc, fuel, transmission: modelId === 'vezel' || modelId === 'grace' ? 'dct' : 'cvt', drive, seats } satisfies Specs,
  active: true,
}));
const grades = rows.map(row => ({
  id: `${row[1]}-${row[0].toLowerCase()}-${row[10].toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,
  generationId: `${row[1]}-${row[0].toLowerCase()}`, name: L(row[10],row[11]), active: true,
}));

const featureRows: Array<[string,string,string,string]> = [
  ['push_start','Push start','পুশ স্টার্ট','convenience'],
  ['keyless_entry','Keyless entry','চাবি ছাড়া প্রবেশ','convenience'],
  ['smart_key','Smart key','স্মার্ট কি','convenience'],
  ['reverse_camera','Reverse camera','রিভার্স ক্যামেরা','parking'],
  ['parking_sensors','Parking sensors','পার্কিং সেন্সর','parking'],
  ['around_view_camera','360° camera','৩৬০° ক্যামেরা','parking'],
  ['sunroof','Sunroof','সানরুফ','exterior'],
  ['panoramic_roof','Panoramic roof','প্যানোরামিক রুফ','exterior'],
  ['alloy_wheels','Alloy wheels','অ্যালয় হুইল','exterior'],
  ['fog_lights','Fog lights','ফগ লাইট','exterior'],
  ['led_headlights','LED headlights','এলইডি হেডলাইট','exterior'],
  ['power_mirrors','Power mirrors','পাওয়ার মিরর','exterior'],
  ['folding_mirrors','Folding mirrors','ফোল্ডিং মিরর','exterior'],
  ['roof_rails','Roof rails','রুফ রেইল','exterior'],
  ['power_sliding_doors','Power sliding doors','পাওয়ার স্লাইডিং ডোর','exterior'],
  ['leather_seats','Leather seats','লেদার সিট','interior'],
  ['fabric_seats','Fabric seats','ফ্যাব্রিক সিট','interior'],
  ['heated_seats','Heated seats','হিটেড সিট','interior'],
  ['power_seats','Power seats','পাওয়ার সিট','interior'],
  ['third_row_seats','Third-row seats','তৃতীয় সারির সিট','interior'],
  ['folding_rear_seats','Folding rear seats','ভাঁজ করা পেছনের সিট','interior'],
  ['climate_control','Climate control','ক্লাইমেট কন্ট্রোল','interior'],
  ['rear_ac','Rear air conditioning','পেছনের এসি','interior'],
  ['cruise_control','Cruise control','ক্রুজ কন্ট্রোল','driving'],
  ['adaptive_cruise','Adaptive cruise control','অ্যাডাপটিভ ক্রুজ কন্ট্রোল','driving'],
  ['paddle_shifters','Paddle shifters','প্যাডেল শিফটার','driving'],
  ['eco_mode','Eco mode','ইকো মোড','driving'],
  ['hill_start_assist','Hill-start assist','হিল স্টার্ট অ্যাসিস্ট','driving'],
  ['abs','ABS','এবিএস','safety'],
  ['esc','Stability control','স্ট্যাবিলিটি কন্ট্রোল','safety'],
  ['airbags','Airbags','এয়ারব্যাগ','safety'],
  ['lane_departure_warning','Lane departure warning','লেন ছাড়ার সতর্কতা','safety'],
  ['blind_spot_monitor','Blind-spot monitor','ব্লাইন্ড স্পট মনিটর','safety'],
  ['automatic_braking','Automatic emergency braking','স্বয়ংক্রিয় জরুরি ব্রেক','safety'],
  ['isofix','ISOFIX child-seat anchors','আইসোফিক্স চাইল্ড সিট অ্যাঙ্কর','safety'],
  ['touchscreen','Touchscreen','টাচস্ক্রিন','infotainment'],
  ['navigation','Navigation','নেভিগেশন','infotainment'],
  ['bluetooth','Bluetooth','ব্লুটুথ','infotainment'],
  ['apple_carplay','Apple CarPlay','অ্যাপল কারপ্লে','infotainment'],
  ['android_auto','Android Auto','অ্যান্ড্রয়েড অটো','infotainment'],
  ['usb_port','USB port','ইউএসবি পোর্ট','infotainment'],
  ['wireless_charging','Wireless charging','ওয়্যারলেস চার্জিং','infotainment'],
];
const features: Feature[] = featureRows.map(([id,en,bn,group]) => ({ id, name:L(en,bn), group, active:true }));

export const seedCatalog: CatalogSnapshot = { version: 1, makes, models, generations, grades, features, mappingRequests: [] };
