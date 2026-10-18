// District groups follow Bangladesh's National Portal (8 divisions, 64 districts):
// https://bangladesh.gov.bd/views/district-list/
export type Division={id:string;en:string;bn:string};
export type District={id:string;divisionId:string;en:string;bn:string;aliases:string[]};
export const divisions:Division[]=[
  {id:'dhaka',en:'Dhaka',bn:'ঢাকা'},{id:'khulna',en:'Khulna',bn:'খুলনা'},
  {id:'chattogram',en:'Chattogram',bn:'চট্টগ্রাম'},{id:'rajshahi',en:'Rajshahi',bn:'রাজশাহী'},
  {id:'sylhet',en:'Sylhet',bn:'সিলেট'},{id:'rangpur',en:'Rangpur',bn:'রংপুর'},
  {id:'mymensingh',en:'Mymensingh',bn:'ময়মনসিংহ'},{id:'barishal',en:'Barishal',bn:'বরিশাল'},
];
type Row=[string,string,string,...string[]];
const groups:Record<string,Row[]>={
  dhaka:[['dhaka','Dhaka','ঢাকা'],['faridpur','Faridpur','ফরিদপুর'],['gazipur','Gazipur','গাজীপুর'],['gopalganj','Gopalganj','গোপালগঞ্জ'],['kishoreganj','Kishoreganj','কিশোরগঞ্জ'],['madaripur','Madaripur','মাদারীপুর'],['manikganj','Manikganj','মানিকগঞ্জ'],['munshiganj','Munshiganj','মুন্সীগঞ্জ','Munshiganj'],['narayanganj','Narayanganj','নারায়ণগঞ্জ'],['narsingdi','Narsingdi','নরসিংদী'],['rajbari','Rajbari','রাজবাড়ী'],['shariatpur','Shariatpur','শরীয়তপুর'],['tangail','Tangail','টাঙ্গাইল']],
  khulna:[['bagerhat','Bagerhat','বাগেরহাট'],['chuadanga','Chuadanga','চুয়াডাঙ্গা'],['jashore','Jashore','যশোর','Jessore'],['jhenaidah','Jhenaidah','ঝিনাইদহ'],['khulna','Khulna','খুলনা'],['kushtia','Kushtia','কুষ্টিয়া'],['magura','Magura','মাগুরা'],['meherpur','Meherpur','মেহেরপুর'],['narail','Narail','নড়াইল'],['satkhira','Satkhira','সাতক্ষীরা']],
  chattogram:[['bandarban','Bandarban','বান্দরবান'],['brahmanbaria','Brahmanbaria','ব্রাহ্মণবাড়িয়া'],['chandpur','Chandpur','চাঁদপুর'],['chattogram','Chattogram','চট্টগ্রাম','Chittagong'],['cumilla','Cumilla','কুমিল্লা','Comilla'],['coxsbazar',"Cox's Bazar",'কক্সবাজার','Coxs Bazar'],['feni','Feni','ফেনী'],['khagrachhari','Khagrachhari','খাগড়াছড়ি'],['lakshmipur','Lakshmipur','লক্ষ্মীপুর'],['noakhali','Noakhali','নোয়াখালী'],['rangamati','Rangamati','রাঙ্গামাটি','Rangamati Hill District']],
  rajshahi:[['bogura','Bogura','বগুড়া','Bogra'],['joypurhat','Joypurhat','জয়পুরহাট'],['naogaon','Naogaon','নওগাঁ'],['natore','Natore','নাটোর'],['chapainawabganj','Chapainawabganj','চাঁপাইনবাবগঞ্জ'],['pabna','Pabna','পাবনা'],['rajshahi','Rajshahi','রাজশাহী'],['sirajganj','Sirajganj','সিরাজগঞ্জ']],
  sylhet:[['habiganj','Habiganj','হবিগঞ্জ'],['moulvibazar','Moulvibazar','মৌলভীবাজার'],['sunamganj','Sunamganj','সুনামগঞ্জ'],['sylhet','Sylhet','সিলেট']],
  rangpur:[['dinajpur','Dinajpur','দিনাজপুর'],['gaibandha','Gaibandha','গাইবান্ধা'],['kurigram','Kurigram','কুড়িগ্রাম'],['lalmonirhat','Lalmonirhat','লালমনিরহাট'],['nilphamari','Nilphamari','নীলফামারী'],['panchagarh','Panchagarh','পঞ্চগড়'],['rangpur','Rangpur','রংপুর'],['thakurgaon','Thakurgaon','ঠাকুরগাঁও']],
  mymensingh:[['jamalpur','Jamalpur','জামালপুর'],['mymensingh','Mymensingh','ময়মনসিংহ'],['netrokona','Netrokona','নেত্রকোণা'],['sherpur','Sherpur','শেরপুর']],
  barishal:[['barguna','Barguna','বরগুনা'],['barishal','Barishal','বরিশাল','Barisal'],['bhola','Bhola','ভোলা'],['jhalakathi','Jhalakathi','ঝালকাঠি'],['patuakhali','Patuakhali','পটুয়াখালী'],['pirojpur','Pirojpur','পিরোজপুর']],
};
export const districts:District[]=Object.entries(groups).flatMap(([divisionId,rows])=>rows.map(([id,en,bn,...aliases])=>({id,divisionId,en,bn,aliases})));
const norm=(x:string)=>x.normalize('NFKC').toLocaleLowerCase().replace(/[\s'’-]+/g,'').trim();
export function findDistrict(value:string):District|undefined{const wanted=norm(value);
  return districts.find(d=>[d.id,d.en,d.bn,...d.aliases].some(name=>norm(name)===wanted))}
export function findDivision(value:string):Division|undefined{const wanted=norm(value);
  return divisions.find(d=>[d.id,d.en,d.bn].some(name=>norm(name)===wanted))}
export function locationMatches(districtValue:string,division?:string,district?:string):boolean{
  const found=findDistrict(districtValue);
  if(division&&found?.divisionId!==division)return false;
  if(district&&found?.id!==district)return false;
  return true;
}
