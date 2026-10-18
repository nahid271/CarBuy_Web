import type { Risk } from './types.ts';

export function assessMessage(text:string):{risk:Risk;reasons:string[]}{
  const value=text.normalize('NFKC').toLowerCase().replace(/[\u200b-\u200d\ufeff]/g,'').replace(/\s+/g,' ');
  const reasons:string[]=[];
  if(/(?:https?:\/\/|www\.|(?:t\.me|wa\.me|bit\.ly)\/|[a-z0-9-]+\.(?:com|net|org|xyz|bd)(?:\/|\b))/i.test(value))reasons.push('external_link');
  if(/(?:booking\s*(?:money|fee)|advance\s*(?:payment|money|deposit)|send\s*(?:money|deposit)|অগ্রিম\s*(?:টাকা|পেমেন্ট)|বুকিং\s*(?:টাকা|মানি)|আগে\s*টাকা|বিকাশ|নগদ|bkash|b\s*kash|nagad)/i.test(value))reasons.push('advance_payment');
  if(/(?:customs?\s*(?:clearance|fee)|lc\s*(?:clearance|fee)|l\/c\s*(?:clearance|fee)|কাস্টমস?\s*(?:ক্লিয়ারেন্স|ফি)|এল\s*সি\s*(?:ফি|ক্লিয়ারেন্স))/i.test(value))reasons.push('clearance_fee');
  if(/(?:i\s*am\s*(?:carbuy|an?\s*admin)|carbuy\s*(?:staff|support|team)|আমি\s*(?:কারবাই|অ্যাডমিন)|carbuy\s*(?:কর্মী|সাপোর্ট))/i.test(value))reasons.push('impersonation');
  return {risk:reasons.some(x=>x!=='external_link')?'held':reasons.length?'warn':'clear',reasons};
}
