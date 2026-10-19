const bn=location.pathname.startsWith('/bn/'),t=(en,bd)=>bn?bd:en,$=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bdt=n=>`৳ ${Number(n).toLocaleString('en-BD')}`;let session=null;
const toast=message=>{const node=$('toast');node.textContent=message;node.classList.add('visible');setTimeout(()=>node.classList.remove('visible'),4200)};
async function request(path,method='GET',payload){const response=await fetch(path,{method,headers:method==='GET'?{}:{'content-type':'application/json','x-csrf-token':session?.csrf??''},body:payload===undefined?undefined:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again');return result}
function readLocal(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
async function syncRecent(){const ids=readLocal('carbuy:recent');if(ids.length&&session?.viewer){await request('/api/saved/recent/sync','POST',{ids:ids.slice(0,20)});writeLocal('carbuy:recent',[])}}
async function signIn(){if(session?.viewer)return true;if(!session?.demo){toast(t('Sign in and verify your phone to continue.','এগোতে সাইন ইন ও ফোন যাচাই করুন।'));return false}
  if(!confirm(t('Use the fake, phone-verified demo buyer account? No real account is created.','নকল, ফোন-যাচাইকৃত ডেমো ক্রেতা অ্যাকাউন্ট ব্যবহার করবেন? আসল অ্যাকাউন্ট তৈরি হবে না।')))return false;
  const response=await fetch('/api/demo/sign-in',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  session=await response.json();if(!response.ok)throw new Error(session.error||'Sign-in failed');await syncRecent();return true}
function card(x,recent=false){const url=`${bn?'/bn':''}/car/${encodeURIComponent(x.id)}`;const img=x.coverKey?`<img src="/media/public/${encodeURIComponent(x.coverKey)}" alt="">`:'<div class="placeholder"></div>';
  const price=x.priceBdt??Math.round((x.priceLakh??0)*100000);const status=!recent&&x.status!=='live'?`<span class="badge">${x.status==='sold'?t('Sold','বিক্রি হয়েছে'):x.status==='expired'?t('Expired','মেয়াদ শেষ'):t('Unavailable','পাওয়া যাচ্ছে না')}</span>`:'';
  const drop=!recent&&x.priceDropBdt>0&&x.status==='live'?`<span class="badge drop">${t('Price dropped','দাম কমেছে')} ${bdt(x.priceDropBdt)}</span>`:'';
  return `<article class="saved-card"><a href="${url}">${img}</a><div class="saved-content"><h3><a href="${url}">${esc(x.title)}</a></h3><div class="price">${price?bdt(price):'—'}</div><div class="meta">${esc(x.area??'')}${x.area&&x.district?', ':''}${esc(x.district??'')}</div>${status}${drop}${recent?'':`<div class="actions"><button type="button" data-remove-car="${esc(x.id)}">${t('Remove saved car','সংরক্ষিত গাড়ি সরান')}</button></div>`}</div></article>`}
async function refresh(){const [cars,alerts,recent,deliveries]=await Promise.all([request(`/api/saved/cars?locale=${bn?'bn':'en'}`),request('/api/saved/alerts'),request(`/api/saved/recent?locale=${bn?'bn':'en'}`),request('/api/saved/deliveries')]);
  $('cars-count').textContent=cars.length;$('alerts-count').textContent=alerts.length;
  $('cars-empty').classList.toggle('hidden',cars.length>0);$('alerts-empty').classList.toggle('hidden',alerts.length>0);$('recent-empty').classList.toggle('hidden',recent.length>0);
  $('cars-list').innerHTML=cars.map(x=>card(x)).join('');$('recent-list').innerHTML=recent.map(x=>card(x,true)).join('');
  $('alerts-list').innerHTML=alerts.map(x=>`<article class="alert-row"><div><strong><a href="${esc(x.path)}">${esc(x.path)}</a></strong><p>${x.frequency==='instant'?t('Instant','সঙ্গে সঙ্গে'):t('Daily · 9 am Dhaka','প্রতিদিন · ঢাকা সকাল ৯টা')} · ${x.channels.map(c=>c==='push'?t('App push','অ্যাপ পুশ'):t('Email','ইমেইল')).join(' + ')}</p></div><button class="unsubscribe" type="button" data-unsubscribe="${esc(x.id)}">${t('Unsubscribe','বন্ধ করুন')}</button></article>`).join('');
  $('deliveries-list').innerHTML=deliveries.length?deliveries.map(x=>`<div class="delivery">${esc(x.channel)} · ${x.listingIds.length} ${t('new match(es)','টি নতুন মিল')} · ${esc(new Date(x.queuedAt).toLocaleString(bn?'bn-BD':'en-BD'))} · ${t('queued','সারিতে আছে')}</div>`).join(''):`<p>${t('No new matches queued yet.','এখনও নতুন মিল নেই।')}</p>`;
  const savedIds=cars.map(x=>x.id);writeLocal('carbuy:saved-cars',savedIds);
}
function translate(){if(!bn)return;const ids={eyebrow:'আপনার ক্রেতা পাতা',title:'সংরক্ষিত গাড়ি ও অ্যালার্ট',intro:'পছন্দের গাড়ির খবর রাখুন এবং নতুন মিল এলে জানুন।',
  'guest-title':'আপনার পছন্দের তালিকা সবখানে','guest-copy':'সব ডিভাইসে সংরক্ষিত গাড়ি ও অ্যালার্ট দেখতে সাইন ইন করুন।','sign-in':'ডেমো ক্রেতা হিসেবে প্রবেশ করুন →',
  'demo-note':'এই স্থানীয় ডেমোতে নকল ফোন-যাচাইকৃত ক্রেতা ব্যবহার হয়। আসল ইমেইল বা পুশ পাঠানো হয় না।',
  'tab-recent':'সম্প্রতি দেখা','cars-title':'সংরক্ষিত গাড়ি','find-cars':'আরও গাড়ি খুঁজুন →','cars-empty':'এখনও কোনো গাড়ি সংরক্ষিত নেই। গাড়ির পাশে হার্টে চাপুন।',
  'alerts-title':'সার্চ অ্যালার্ট','alerts-intro':'সার্চের ফিল্টার বেছে নিন, তারপর সময় ও মাধ্যম নির্ধারণ করুন। এই ডেমো প্রতি মিনিটে নতুন গাড়ি দেখে।',
  'search-url-label':'সার্চ পাতা','frequency-label':'কখন জানাবেন','channels-label':'কোথায় জানাবেন','push-label':'অ্যাপ পুশ','email-label':'ইমেইল','create-alert':'অ্যালার্ট তৈরি করুন →',
  'alerts-empty':'এখনও কোনো অ্যালার্ট নেই। নতুন গাড়ির জন্য সার্চ সংরক্ষণ করুন।','deliveries-title':'নোটিফিকেশন প্রিভিউ',
  'delivery-note':'ডেমোতে সারিবদ্ধ খবর এখানে দেখা যায়। চালুর আগে আসল পুশ ও ইমেইল সেবা যুক্ত করতে হবে।','recent-title':'সম্প্রতি দেখা',
  'recent-empty':'সাইন ইন অবস্থায় দেখা গাড়ি সব ডিভাইসে এখানে থাকবে।',browse:'গাড়ি দেখুন',inbox:'ইনবক্স'};
  for(const [id,value] of Object.entries(ids))$(id).textContent=value;
  $('tab-cars').firstChild.textContent='সংরক্ষিত গাড়ি ';$('tab-alerts').firstChild.textContent='সার্চ অ্যালার্ট ';
  $('language').textContent='English';$('language').href='/saved';$('browse').href='/bn/cars';$('inbox').href='/bn/inbox';$('find-cars').href='/bn/cars';
  document.querySelector('[value="instant"]').textContent='সঙ্গে সঙ্গে';document.querySelector('[value="daily"]').textContent='প্রতিদিন, ঢাকা সকাল ৯টার পর';}
async function init(){translate();$('search-url').value=new URLSearchParams(location.search).get('search')||'/cars';
  session=await (await fetch('/api/detail/session')).json();if(session.viewer){await syncRecent();$('workspace').classList.remove('hidden');await refresh()}
  else $('guest').classList.remove('hidden');
  $('sign-in').addEventListener('click',async()=>{try{if(await signIn()){$('guest').classList.add('hidden');$('workspace').classList.remove('hidden');await refresh()}}catch(error){toast(error.message)}});
  $('alert-form').addEventListener('submit',async e=>{e.preventDefault();try{const form=new FormData(e.currentTarget),channels=['push','email'].filter(x=>form.has(x));
    await request('/api/saved/alerts','POST',{path:String(form.get('path')??''),frequency:String(form.get('frequency')??''),channels});await refresh();toast(t('Alert created.','অ্যালার্ট তৈরি হয়েছে।'))}catch(error){toast(error.message)}});
  document.addEventListener('click',async e=>{const remove=e.target.closest('[data-remove-car]'),unsub=e.target.closest('[data-unsubscribe]');try{
    if(remove){await request(`/api/saved/cars/${encodeURIComponent(remove.dataset.removeCar)}`,'DELETE');await refresh();toast(t('Car removed.','গাড়ি সরানো হয়েছে।'))}
    if(unsub){await request(`/api/saved/alerts/${encodeURIComponent(unsub.dataset.unsubscribe)}`,'DELETE');await refresh();toast(t('Alert unsubscribed.','অ্যালার্ট বন্ধ হয়েছে।'))}
  }catch(error){toast(error.message)}})}
init().catch(error=>toast(error.message||'Could not load saved items'));
