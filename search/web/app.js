const boot=JSON.parse(document.getElementById('bootstrap').textContent);
const locale=boot.route.locale;
const bn=locale==='bn';
const t=(en,bd)=>bn?bd:en;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={data:boot.data,catalog:null,locations:null,loading:false};
const savedKey='carbuy:saved-cars',alertKey='carbuy:saved-searches';
const readLocal=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
const writeLocal=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const urlFor=(params,path=location.pathname)=>`${path}${params.toString()?`?${params}`:''}`;
const nameFor=(id,kind)=>{const c=state.catalog;return c?.[kind]?.find(x=>x.id===id)?.name?.[locale]||id};
function card(card){
  const badges=[card.auctionVerified?t('Auction sheet verified','অকশন শিট যাচাইকৃত'):null,card.papersChecked?t('Papers checked','কাগজপত্র যাচাই'):null,
    card.verifiedDealer?t('Verified dealer','যাচাইকৃত ডিলার'):null].filter(Boolean);
  const paid=card.placement?`<span class="paid-label">${card.placement==='top'?'Top · Paid':'Featured · Paid'}</span>`:'';
  const isSaved=readLocal(savedKey).includes(card.id);
  return `<article class="car-card"><a href="/preview/${encodeURIComponent(card.id)}${bn?'?lang=bn':''}" class="card-photo" aria-label="${esc(card.title)}">${card.coverKey?`<img src="/media/public/${encodeURIComponent(card.coverKey)}" alt="${esc(card.title)}" loading="lazy">`:''}${paid}</a><div class="card-info"><div class="card-topline"><span>${esc(card.condition)} · ${esc(card.year)}</span><span>${esc(card.area)}, ${esc(card.district)}</span></div><h3><a href="/preview/${encodeURIComponent(card.id)}${bn?'?lang=bn':''}">${esc(card.title)}</a></h3><div class="price">৳ ${esc(card.priceLakh.toLocaleString('en-BD'))} <small>${t('lakh','লাখ')}</small></div><div class="specs"><span>${esc(card.mileageKm.toLocaleString('en-BD'))} km</span><span>${esc(card.engineCc)} cc</span><span>${esc(card.fuel)}</span></div><div class="card-footer"><div class="badges">${badges.map(x=>`<span class="trust-badge">${esc(x)}</span>`).join('')}</div><button type="button" class="save-btn ${isSaved?'saved':''}" data-save="${esc(card.id)}" aria-label="${isSaved?'Remove saved car':'Save car'}">${isSaved?'♥':'♡'}</button></div></div></article>`;
}
function setupLanguage(){
  $('language').textContent=bn?'English':'বাংলা';
  const current=location.pathname;
  $('language').href=`${bn?(current.replace(/^\/bn/,'')||'/'):(current==='/'?'/bn':`/bn${current}`)}${location.search}`;
  if(bn){$('hero-title').innerHTML='আপনার পছন্দের গাড়ি খুঁজুন।<br><em>ভরসা নিয়ে এগিয়ে যান।</em>';
    $('hero-copy').textContent='দাম, এলাকা এবং যাচাইকৃত তথ্য দিয়ে গাড়ি খুঁজুন।';
    $('quick-q').placeholder='টয়োটা অ্যাক্সিও, নোয়া, X-Trail...';
    document.querySelector('#quick-search button').textContent='গাড়ি খুঁজুন →';
    $('search-title').textContent='বিক্রির জন্য গাড়ি';$('top-q').placeholder='মেক, মডেল, এলাকা বা কীওয়ার্ড দিয়ে খুঁজুন';
    document.querySelector('#top-search button').textContent='খুঁজুন →';
    const translations={
      '.top-nav a[href="/cars"]':'গাড়ি দেখুন','.top-nav a[href="/#how"]':'যেভাবে কাজ করে','.sell-link':'গাড়ি বিক্রি করুন ↗',
      '.hero-promises':'✓ লাইভ বিজ্ঞাপন   ✓ যাচাইকৃত তথ্য   ✓ লাখে দাম',
      '#explore .section-head h2':'যা জরুরি, তা দিয়ে শুরু করুন','#explore .text-link':'সব গাড়ি দেখুন →',
      '.explore-panel:nth-child(1) h3':'জনপ্রিয় মডেল','.explore-panel:nth-child(2) h3':'বাজেট অনুযায়ী',
      '.explore-panel:nth-child(3) h3':'বডি স্টাইল','#fresh .section-head h2':'নতুন গাড়ি','#fresh .text-link':'সব নতুন বিজ্ঞাপন →',
      '#recent-section h2':'সম্প্রতি দেখা','#filters .filter-heading h2':'ফিল্টার','#clear-filters':'সব মুছুন',
      '.filter-group:nth-of-type(1) h3':'গাড়ি','.filter-group:nth-of-type(2) h3':'দাম ও বয়স',
      '.filter-group:nth-of-type(3) h3':'বিবরণ','.filter-group:nth-of-type(4) h3':'বিক্রেতা ও এলাকা',
      '.filter-group:nth-of-type(5) h3':'যাচাই করা তথ্য','.apply-button':'গাড়ি দেখুন →',
      '#empty-state h2':'কোনো গাড়ি পাওয়া যায়নি','#empty-state p':'ফিল্টার কমিয়ে আবার খুঁজুন অথবা সার্চ সংরক্ষণ করুন।',
      '#save-alert':'এই ডিভাইসে সার্চ রাখুন','#save-few':'এই ডিভাইসে সার্চ রাখুন',
    };
    for(const [selector,value] of Object.entries(translations))if(value&&document.querySelector(selector))document.querySelector(selector).textContent=value;
    const labels={condition:'অবস্থা',make:'মেক',model:'মডেল',grade:'গ্রেড',priceMin:'সর্বনিম্ন দাম',priceMax:'সর্বোচ্চ দাম',
      yearMin:'মডেল সাল থেকে',yearMax:'মডেল সাল পর্যন্ত',regMin:'নিবন্ধন সাল থেকে',regMax:'নিবন্ধন সাল পর্যন্ত',
      mileageMin:'সর্বনিম্ন মাইলেজ',mileageMax:'সর্বোচ্চ মাইলেজ',ccMin:'ইঞ্জিন সিসি থেকে',ccMax:'ইঞ্জিন সিসি পর্যন্ত',
      fuel:'জ্বালানি',body:'বডি',transmission:'গিয়ার',colour:'রং',seller:'বিক্রেতা',division:'বিভাগ',district:'জেলা',area:'এলাকা',
      auctionVerified:'অকশন শিট যাচাইকৃত',papersChecked:'কাগজপত্র যাচাই',verifiedDealer:'যাচাইকৃত ডিলার',minAuctionGrade:'সর্বনিম্ন অকশন গ্রেড'};
    for(const [name,value] of Object.entries(labels)){const label=$('filters-form').elements[name]?.closest('label');
      const node=label&&[...label.childNodes].find(x=>x.nodeType===3&&x.textContent.trim());if(node)node.textContent=` ${value} `;}
    const any={condition:'যেকোনো অবস্থা',make:'যেকোনো মেক',grade:'যেকোনো গ্রেড',fuel:'যেকোনো জ্বালানি',body:'যেকোনো বডি',
      transmission:'যেকোনো গিয়ার',colour:'যেকোনো রং',seller:'যেকোনো বিক্রেতা',division:'সব বিভাগ',district:'সব জেলা',area:'সব এলাকা'};
    for(const [id,value] of Object.entries(any))$(id).querySelector('option[value=""]').textContent=value;
    const sortLabels=['সেরা মিল','সর্বশেষ','দাম: কম থেকে বেশি','দাম: বেশি থেকে কম','সবচেয়ে কম মাইলেজ','নতুন মডেল সাল'];
    [...$('sort').options].forEach((option,i)=>option.textContent=sortLabels[i]);
    document.querySelector('.results-toolbar label').firstChild.textContent='সাজান ';
    document.querySelector('#few-results strong').textContent='অল্প কয়েকটি গাড়ি পাওয়া গেছে।';
  }
  $('quick-search').action=bn?'/bn/cars':'/cars';$('top-search').action=bn?'/bn/cars':'/cars';
}
function optionRows(select,options,current){
  const empty=select.querySelector('option[value=""]')?.outerHTML||'';
  select.innerHTML=empty+options.map(x=>`<option value="${esc(x.id)}"${x.id===current?' selected':''}>${esc(x.label)}${x.count===undefined?'':` (${x.count})`}</option>`).join('');
}
function modelsFor(makeId,facets,selected){
  const all=facets?.model||[];
  const options=all.filter(x=>!makeId||state.catalog.models.find(m=>m.id===x.id)?.makeId===makeId);
  $('model').innerHTML=options.map(x=>`<option value="${esc(x.id)}"${selected.includes(x.id)?' selected':''}>${esc(x.label)} (${x.count})</option>`).join('');
}
function populateFilters(result){
  const q=result.query,f=result.facets,form=$('filters-form');
  const keys={priceMin:'minPriceLakh',priceMax:'maxPriceLakh',yearMin:'minYear',yearMax:'maxYear',regMin:'minRegistrationYear',regMax:'maxRegistrationYear',mileageMin:'minMileageKm',mileageMax:'maxMileageKm',ccMin:'minEngineCc',ccMax:'maxEngineCc',minAuctionGrade:'minAuctionGrade'};
  for(const [input,key] of Object.entries(keys))form.elements[input].value=q[key]??'';
  optionRows($('condition'),f.condition,q.condition);optionRows($('make'),f.make,q.makeId);
  modelsFor(q.makeId,f,q.modelIds||[]);optionRows($('grade'),f.grade,q.gradeId);
  optionRows($('fuel'),f.fuel,q.fuel);optionRows($('body'),f.body,q.body);optionRows($('transmission'),f.transmission,q.transmission);
  optionRows($('colour'),f.colour,q.colour);optionRows($('seller'),f.sellerType,q.sellerType);
  optionRows($('division'),f.division,q.division);optionRows($('district'),f.district,q.district);optionRows($('area'),f.area,q.area);
  for(const key of ['auctionVerified','papersChecked','verifiedDealer'])form.elements[key].checked=Boolean(q[key]);
  $('auction-count').textContent=f.trust.find(x=>x.id==='auctionVerified')?.count??0;
  $('papers-count').textContent=f.trust.find(x=>x.id==='papersChecked')?.count??0;
  $('dealer-count').textContent=f.trust.find(x=>x.id==='verifiedDealer')?.count??0;
  $('sort').value=q.sort;$('top-q').value=q.keyword||'';
}
function chips(q){
  const pairs=[q.keyword,q.condition,q.makeId&&nameFor(q.makeId,'makes'),...(q.modelIds||[]).map(x=>nameFor(x,'models')),
    q.maxPriceLakh&&`≤ ৳${q.maxPriceLakh} lakh`,q.minPriceLakh&&`≥ ৳${q.minPriceLakh} lakh`,q.district,q.area,q.auctionVerified&&'Auction verified',
    q.papersChecked&&'Papers checked',q.verifiedDealer&&'Verified dealer',q.minAuctionGrade!==undefined&&`Auction ≥ ${q.minAuctionGrade}`].filter(Boolean);
  $('active-filters').innerHTML=pairs.map(x=>`<span>${esc(x)}</span>`).join('');
}
function pagination(result){
  if(result.totalPages<=1){$('pagination').innerHTML='';return}
  const q=new URLSearchParams(location.search),links=[];
  if(result.page>1){q.set('page',String(result.page-1));links.push(`<a href="${esc(urlFor(q))}">← Previous</a>`)}
  links.push(`<span class="current">${result.page} / ${result.totalPages}</span>`);
  if(result.page<result.totalPages){q.set('page',String(result.page+1));links.push(`<a href="${esc(urlFor(q))}">Next →</a>`)}
  $('pagination').innerHTML=links.join('');
}
function renderSearch(result){
  state.data=result;const q=result.query;
  $('result-summary').textContent=t('Browse cars across Bangladesh','বাংলাদেশজুড়ে গাড়ি খুঁজুন');
  $('result-count').textContent=`${result.total.toLocaleString('en-BD')} ${bn?'টি গাড়ি পাওয়া গেছে':result.total===1?'car found':'cars found'}`;
  $('results').innerHTML=result.cards.map(card).join('');
  $('empty-state').classList.toggle('hidden',result.total!==0);
  $('few-results').classList.toggle('hidden',result.total===0||result.total>3);
  $('few-suggestions').textContent=result.suggestions.join(' ');
  $('suggestions').innerHTML=result.suggestions.map(x=>`<li>${esc(x)}</li>`).join('');
  $('search-title').textContent=boot.route.modelId?`${nameFor(boot.route.modelId,'models')} ${t('cars for sale','বিক্রির জন্য গাড়ি')}`:boot.route.district?`${t('Cars in','গাড়ি')} ${boot.route.district}`:t('Cars for sale','বিক্রির জন্য গাড়ি');
  populateFilters(result);chips(q);pagination(result);
}
function renderHome(home){
  $('home-cards').innerHTML=home.newListings.map(card).join('');
  $('popular-models').innerHTML=home.popularModels.map(x=>{const model=state.catalog.models.find(m=>m.id===x.id);return `<a href="${bn?'/bn':''}/cars/${encodeURIComponent(model.makeId)}/${encodeURIComponent(x.id)}">${esc(x.label)} <small>${x.count}</small></a>`}).join('');
  $('budget-links').innerHTML=home.budgets.map(x=>`<a href="${bn?'/bn':''}/cars?priceMax=${x.maxLakh}">${t('Under','সর্বোচ্চ')} ৳${x.maxLakh} lakh <small>(${x.count})</small></a>`).join('');
  $('body-links').innerHTML=home.bodies.map(x=>`<a href="${bn?'/bn':''}/cars?body=${encodeURIComponent(x.id)}">${esc(x.label)} <small>${x.count}</small></a>`).join('');
}
async function recent(){
  const ids=readLocal('carbuy:recent');if(!ids.length)return;
  try{const res=await fetch(`/api/recent?ids=${encodeURIComponent(ids.join(','))}&locale=${locale}`);if(!res.ok)return;
    const cards=await res.json();if(cards.length){$('recent-section').classList.remove('hidden');$('recent-cards').innerHTML=cards.map(card).join('')}}catch{}
}
function applyForm(e){
  e.preventDefault();const params=new URLSearchParams();const form=$('filters-form');
  const keyword=$('top-q').value.trim();if(keyword)params.set('q',keyword);
  for(const element of form.elements){if(!element.name||element.disabled)continue;
    if(element.type==='checkbox'&&!element.checked)continue;
    if(element.tagName==='SELECT'&&element.multiple){for(const option of element.selectedOptions)params.append(element.name,option.value);continue}
    if(element.value)params.set(element.name,element.value);}
  if($('sort').value!=='best_match')params.set('sort',$('sort').value);
  location.href=urlFor(params);
}
function wire(){
  document.addEventListener('click',e=>{const button=e.target.closest('[data-save]');if(!button)return;
    const id=button.dataset.save;let ids=readLocal(savedKey);ids=ids.includes(id)?ids.filter(x=>x!==id):[id,...ids].slice(0,200);writeLocal(savedKey,ids);
    button.classList.toggle('saved',ids.includes(id));button.textContent=ids.includes(id)?'♥':'♡';button.setAttribute('aria-label',ids.includes(id)?'Remove saved car':'Save car')});
  if(boot.route.kind!=='search')return;
  $('filters-form').addEventListener('submit',applyForm);
  $('top-search').addEventListener('submit',e=>{e.preventDefault();const q=$('top-q').value.trim();location.href=`${bn?'/bn':''}/cars${q?`?q=${encodeURIComponent(q)}`:''}`});
  $('sort').addEventListener('change',()=>{const p=new URLSearchParams(location.search);p.set('sort',$('sort').value);p.delete('page');location.href=urlFor(p)});
  $('clear-filters').addEventListener('click',()=>{location.href=bn?'/bn/cars':'/cars'});
  $('make').addEventListener('change',()=>modelsFor($('make').value,state.data.facets,[]));
  $('division').addEventListener('change',()=>{const division=$('division').value;const options=state.data.facets.district.filter(x=>!division||state.locations.districts.find(d=>d.id===x.id)?.divisionId===division);optionRows($('district'),options,'');optionRows($('area'),[],'')});
  $('district').addEventListener('change',()=>{optionRows($('area'),state.data.facets.area,'')});
  for(const id of ['save-alert','save-few'])$(id).addEventListener('click',()=>{const searches=readLocal(alertKey),url=location.pathname+location.search;if(!searches.includes(url))searches.unshift(url);writeLocal(alertKey,searches.slice(0,30));$(id).textContent=t('Saved on this device','এই ডিভাইসে সংরক্ষিত')});
  $('filters').querySelector('.filter-heading').addEventListener('click',()=>{if(window.innerWidth<=760)$('filters').classList.toggle('open')});
  if(window.matchMedia('(max-width: 760px)').matches&&'IntersectionObserver'in window){
    $('pagination').classList.add('hidden');const observer=new IntersectionObserver(async entries=>{
      if(!entries[0].isIntersecting||state.loading||!state.data.nextCursor)return;state.loading=true;
      try{const p=new URLSearchParams(location.search);p.set('route',location.pathname);p.set('cursor',state.data.nextCursor);
        const res=await fetch(`/api/app-search?${p}`);if(!res.ok)throw new Error('Could not load more');
        const next=await res.json();$('results').insertAdjacentHTML('beforeend',next.cards.map(card).join(''));
        state.data.nextCursor=next.nextCursor;state.data.page=next.page;
      }catch{ $('pagination').classList.remove('hidden') }finally{state.loading=false}
    },{rootMargin:'350px'});observer.observe($('load-sentinel'));
  }
}
async function init(){
  setupLanguage();$('home').classList.toggle('hidden',boot.route.kind!=='home');$('search').classList.toggle('hidden',boot.route.kind!=='search');
  try{const response=await fetch('/api/bootstrap');if(!response.ok)throw new Error('Bootstrap failed');const data=await response.json();state.catalog=data.catalog;state.locations=data;
    if(boot.route.kind==='home'){renderHome(boot.data);recent()}else renderSearch(boot.data);
  }catch(error){console.error(error)}wire();
}
init();
