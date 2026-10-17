const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const labels = ['Chassis number','Confirm vehicle','Condition & papers','Mileage & price','Photos','Description','Location','Preview','Payment & review'];
let catalog, listing, step = 0, saveTimer, pendingPatch = {}, saveQueue = Promise.resolve();
async function api(path, method='GET', data) {
  const response = await fetch(path,{method,headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  const result = await response.json();
  if(!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  return result;
}
function toast(message) { const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(node._timer);node._timer=setTimeout(()=>node.classList.remove('show'),4000); }
function field(name,label,type='text',extra='') { const value=listing.data[name]??'';return `<div class="field"><label for="${name}">${label}</label><input id="${name}" data-field="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`; }
function options(items,selected,placeholder='Select') {return `<option value="">${placeholder}</option>`+items.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name?.en??x.label??x.id)}</option>`).join('');}
function select(name,label,items,placeholder='Select') {return `<div class="field"><label for="${name}">${label}</label><select id="${name}" data-field="${name}">${options(items,listing.data[name],placeholder)}</select></div>`;}
function renderHome() {
  $('#home').hidden=false;$('#editor').hidden=true;
  api('/api/mine').then(items=>{
    $('#listing-list').innerHTML=items.length?items.map(item=>`<div class="listing-row"><div><strong>${esc(item.modelId??'New vehicle')}</strong><small>${esc(item.status.replaceAll('_',' '))} · ${item.views} views · ${item.contacts.chat+item.contacts.call+item.contacts.whatsapp} contacts · ${item.saves} saves · ${item.daysLive} days live</small></div><button data-open="${esc(item.id)}">Open</button></div>`).join(''):'<p class="empty">No cars yet. Start with the chassis number.</p>';
  }).catch(error=>toast(error.message));
}
function render() {
  $('#home').hidden=true;$('#editor').hidden=false;
  $('#progress-text').textContent=`Step ${step+1} of ${labels.length} · ${labels[step]}`;
  $('#progress-bar').style.width=`${((step+1)/labels.length)*100}%`;
  $('#steps').innerHTML=labels.map((label,i)=>`<button class="step-nav ${i===step?'active':i<step?'done':''}" data-step="${i}"><span class="step-number">${i+1}</span>${label}</button>`).join('');
  $('#back').disabled=step===0;$('#next').textContent=step===8?'My listings':'Continue';
  const d=listing.data;
  const titles=[
    ['Start with the chassis number','Enter the number from the vehicle and its papers. You can continue manually if it is not in our catalogue.'],
    ['Confirm the vehicle','Check every auto-filled detail against the car and its documents. The grade always needs your confirmation.'],
    ['Condition and papers','Used means registered in Bangladesh. Reconditioned means an unregistered import. Papers stay private for moderators.'],
    ['Mileage and price','Set your asking price in BDT. You can type “28.5 lakh”.'],
    ['Show the car clearly','Add 4–20 photos. Images are resized on your device and processed again before storage.'],
    ['Describe your car','Write in Bangla or English. Review any suggested text before publishing.'],
    ['Where is the car?','Give the district and area where a buyer can inspect it.'],
    ['Review your listing','Check all details before payment and moderation.'],
    ['Payment and review','A private listing runs for 60 days after approval. This local demo uses simulated payment.'],
  ];
  let html=`<h2>${titles[step][0]}</h2><p class="subhead">${titles[step][1]}</p>`;
  if(step===0) html+=`${field('chassisNumber','Japanese chassis number or 17-character VIN','text','placeholder="NZT260-3173714"')}<button class="small-button" id="decode">Decode chassis</button><div id="decode-result"></div>`;
  if(step===1) {
    const makes=catalog.makes.filter(x=>x.active),models=catalog.models.filter(x=>x.active&&x.makeId===d.makeId),gens=catalog.generations.filter(x=>x.active&&x.modelId===d.modelId),grades=catalog.grades.filter(x=>x.active&&x.generationId===d.generationId);
    html+=`<div class="field-grid">${select('makeId','Make',makes)}${select('modelId','Model',models)}${select('generationId','Generation / chassis code',gens)}${select('gradeId','Grade',[...grades,{id:'not-listed',name:{en:'Not listed — enter grade'}}])}${d.gradeId==='not-listed'?field('gradeFreeText','Enter grade name'):''}${field('manufactureYear','Manufacture year','number','min="1950" max="2100"')}${field('engineCc','Engine cc','number','min="1"')}${select('fuel','Fuel',Object.entries(catalog.values.fuel).map(([id,name])=>({id,name})))}${select('transmission','Transmission',Object.entries(catalog.values.transmission).map(([id,name])=>({id,name})))}${select('body','Body type',Object.entries(catalog.values.body).map(([id,name])=>({id,name})))}</div><div class="info">Missing a make, model, generation or grade? Choose “Not listed” for grade or use the free-text request below. An admin will map it.</div><div class="field-grid"><div class="field"><label for="unknown-kind">Missing item</label><select id="unknown-kind"><option value="make">Make</option><option value="model" selected>Model</option><option value="generation">Generation</option><option value="grade">Grade</option></select></div><div class="field"><label for="unknown-text">Name to add</label><input id="unknown-text" placeholder="Enter the missing name"></div></div><button class="small-button" id="unknown-submit">Send to catalogue admin</button>`;
  }
  if(step===2) html+=`<div class="field-grid">${select('condition','Condition',[{id:'reconditioned',name:{en:'Reconditioned — unregistered import'}},{id:'used',name:{en:'Used — registered in Bangladesh'}}])}${d.condition==='used'?field('registrationYear','Registration year','number','min="1950" max="2100"'):''}${field('registrationNumber','Registration number (optional)','text','placeholder="Dhaka Metro-Ga 11-1234"')}${field('taxTokenExpiry','Tax token expiry (optional)','date')}${field('fitnessExpiry','Fitness expiry (optional)','date')}${field('owners','Number of owners (optional)','number','min="1"')}${field('auctionGrade','Auction grade (optional)')}</div><div class="field"><label>Private papers</label><input id="paper-file" type="file" accept="image/*,application/pdf"><select id="paper-type"><option value="registration">Registration certificate</option><option value="smart_card">Smart card</option><option value="tax_token">Tax token</option><option value="fitness">Fitness</option></select><p class="help">${listing.papers.length} paper(s) uploaded. Only a moderator may retrieve them.</p></div><div class="field"><label>Seller-provided auction sheet (optional)</label><input id="auction-file" type="file" accept="image/*"><p class="help">Shown with “Seller-provided, unverified” until a later verification order is completed.</p></div>`;
  if(step===3) html+=`<div class="field-grid">${field('mileageKm','Mileage (km)','number','min="0"')}${field('priceInput','Asking price','text','placeholder="28.5 lakh"')}<div class="field"><label>Full price</label><div id="price-display" class="info">${d.priceBdt?new Intl.NumberFormat('en-IN',{style:'currency',currency:'BDT',maximumFractionDigits:0}).format(d.priceBdt):'Enter a price'}</div></div><div class="field"><label class="inline"><input id="negotiable" data-field="negotiable" type="checkbox" ${d.negotiable?'checked':''}> Negotiable</label></div>${field('colour','Colour (optional)')}</div><button class="small-button" id="guidance">Check comparable prices</button><div id="guidance-result"></div>`;
  if(step===4) html+=`<div class="field"><label for="photo-files">Upload photos</label><input id="photo-files" type="file" accept="image/*" capture="environment" multiple><span class="help">${listing.photos.length} photo(s). Minimum 4, maximum 20 for private sellers.</span></div><div class="photo-grid">${listing.photos.map((photo,i)=>`<div class="photo"><img src="/media/public/${esc(photo.webpKey)}" alt="Vehicle photo ${i+1}"><footer><small>${i+1}${photo.hints.includes('dark')?' · Dark':''}${photo.hints.includes('blurry')?' · Blurry':''}</small><span><button data-move="${esc(photo.id)}" data-dir="-1" aria-label="Move photo left">←</button> <button data-move="${esc(photo.id)}" data-dir="1" aria-label="Move photo right">→</button> <button data-remove-photo="${esc(photo.id)}" aria-label="Remove photo">×</button></span></footer></div>`).join('')}</div>`;
  if(step===5) html+=`<div class="field"><label for="description">Description (Bangla or English)</label><textarea id="description" data-field="description" placeholder="Condition, service history, reason for selling...">${esc(d.description)}</textarea></div><button class="small-button" id="draft-text">Suggest description</button><p class="help">The suggestion is a starting point. Edit it before publishing.</p><details class="feature-list"><summary>Vehicle features (${(d.featureIds??[]).length} selected)</summary><div class="field-grid">${catalog.features.filter(x=>x.active).map(feature=>`<label class="inline"><input type="checkbox" data-feature="${esc(feature.id)}" ${(d.featureIds??[]).includes(feature.id)?'checked':''}> ${esc(feature.name.en)} <small>${esc(feature.name.bn)}</small></label>`).join('')}</div></details>`;
  if(step===6) html+=`<div class="field-grid">${field('district','District','text','placeholder="Dhaka"')}${field('area','Area','text','placeholder="Dhanmondi"')}</div>`;
  if(step===7) html+=`<div class="preview">${[['Status',listing.status],['Vehicle',`${d.makeId??'—'} ${d.modelId??'—'}`],['Grade',d.gradeId==='not-listed'?d.gradeFreeText:d.gradeId],['Condition',d.condition],['Mileage',d.mileageKm===undefined?'—':`${d.mileageKm} km`],['Price',d.priceBdt?`৳${new Intl.NumberFormat('en-IN').format(d.priceBdt)}`:'—'],['Location',`${d.area??'—'}, ${d.district??'—'}`],['Photos',listing.photos.length],['Papers',listing.papers.length],['Auction sheet',listing.auctionSheet?.status??'None']].map(([key,value])=>`<div><small>${esc(key)}</small><strong>${esc(value??'—')}</strong></div>`).join('')}</div><p class="info">Your chassis number and papers are not displayed publicly. The listing enters review after payment.</p>`;
  if(step===8) html+=`<div class="info"><strong>Listing status: ${esc(listing.status.replaceAll('_',' '))}</strong><br>Private fee: ৳400 for 60 days. Rejection triggers a refund. This demo does not charge money.</div><div id="payment-actions"></div>`;
  $('#step-content').innerHTML=html;
  if(step===3) $('#priceInput').value=d.priceBdt?String(d.priceBdt):'';
  if(step===8) renderPaymentActions();
}
function renderPaymentActions() {
  const node=$('#payment-actions');if(!node)return;
  const status=listing.status;
  node.innerHTML=status==='draft'?'<button class="primary" id="submit">Validate and start payment</button>':status==='pending_payment'?'<button class="primary" id="demo-pay">Simulate successful payment</button>':status==='pending_review'?'<button class="small-button" id="demo-approve">Simulate moderator approval</button>':status==='live'?`<div class="inline"><button class="small-button" id="share">Share links</button><button class="small-button" id="withdraw">Withdraw</button><select id="sold-via"><option value="carbuy">Sold on CarBuy</option><option value="elsewhere">Sold elsewhere</option><option value="showroom_trade_in">Showroom trade-in</option><option value="didnt_sell">Didn't sell</option></select><button class="small-button" id="sold">Mark outcome</button></div>`:status==='expired'?'<button class="primary" id="renew">Renew listing</button>':status==='withdrawn'?'<div class="inline"><button class="small-button" id="relist-withdrawn">Relist within paid term</button><button class="primary" id="renew">Renew with another fee</button></div>':status==='sold'?'<button class="primary" id="relist-sold">Create a new listing for this vehicle</button>':`<p>Status: ${esc(status)}. Open this listing from My listings to continue.</p>`;
}
function queuePatch(patch) { Object.assign(pendingPatch,patch);$('#save-state').textContent='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(flush,350); }
function flush() {
  clearTimeout(saveTimer);
  const patch=pendingPatch;pendingPatch={};
  if(!Object.keys(patch).length)return saveQueue;
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{const updated=listing.status==='live'?await api(`/api/listings/${listing.id}/edit-live`,'POST',{patch}):await api(`/api/listings/${listing.id}`,'PATCH',{patch,version:listing.version});listing=updated;$('#save-state').textContent='Saved';}).catch(error=>{Object.assign(pendingPatch,patch);toast(error.message);$('#save-state').textContent='Save failed';throw error;});
  return saveQueue;
}
async function openListing(id) { listing=await api(`/api/listings/${id}`);step=0;render(); }
async function fileBase64(file,compress) {
  if(!compress) return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  const image=await createImageBitmap(file);const scale=Math.min(1,1800/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));if(!blob)throw new Error('Photo compression failed');return fileBase64(blob,false);
}
$('#new-listing').addEventListener('click',async()=>{try{listing=await api('/api/listings','POST',{});step=0;render();}catch(e){toast(e.message)}});
$('#my-listings').addEventListener('click',async()=>{await flush();renderHome()});
$('#listing-list').addEventListener('click',event=>{const id=event.target.dataset.open;if(id)openListing(id).catch(e=>toast(e.message))});
$('#back').addEventListener('click',async()=>{await flush();step=Math.max(0,step-1);render()});
$('#next').addEventListener('click',async()=>{await flush();if(step===8){renderHome();return;}step++;render()});
$('#steps').addEventListener('click',async event=>{const target=event.target.closest('[data-step]');if(!target)return;await flush();step=Number(target.dataset.step);render()});
$('#step-content').addEventListener('input',event=>{const key=event.target.dataset.field;if(!key||key==='priceInput')return;const value=event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?(event.target.value===''?undefined:Number(event.target.value)):event.target.value;listing.data[key]=value;queuePatch({[key]:value})});
$('#step-content').addEventListener('change',async event=>{
  const target=event.target,key=target.dataset.field;
  if(key && key!=='priceInput'){const value=target.type==='checkbox'?target.checked:target.type==='number'?(target.value===''?null:Number(target.value)):target.value;listing.data[key]=value;const patch={[key]:value};if(key==='makeId'){Object.assign(patch,{modelId:null,generationId:null,gradeId:null});Object.assign(listing.data,patch)}if(key==='modelId'){Object.assign(patch,{generationId:null,gradeId:null});Object.assign(listing.data,patch)}if(key==='generationId'){patch.gradeId=null;listing.data.gradeId=null}if(key==='condition'&&value==='reconditioned'){patch.registrationYear=null;listing.data.registrationYear=null}queuePatch(patch);if(['makeId','modelId','generationId','gradeId','condition'].includes(key)){await flush();render()}}
  if(target.dataset.feature){const values=new Set(listing.data.featureIds??[]);target.checked?values.add(target.dataset.feature):values.delete(target.dataset.feature);listing.data.featureIds=[...values];queuePatch({featureIds:listing.data.featureIds});}
  if(target.id==='photo-files'){try{for(const file of target.files){const bytesBase64=await fileBase64(file,true);listing=await api(`/api/listings/${listing.id}/photo`,'POST',{bytesBase64});}render()}catch(e){toast(e.message)}}
  if(target.id==='paper-file'&&target.files[0]){try{const bytesBase64=await fileBase64(target.files[0],false);listing=await api(`/api/listings/${listing.id}/paper`,'POST',{type:$('#paper-type').value,bytesBase64});render()}catch(e){toast(e.message)}}
  if(target.id==='auction-file'&&target.files[0]){try{const bytesBase64=await fileBase64(target.files[0],true);listing=await api(`/api/listings/${listing.id}/auction`,'POST',{bytesBase64});render()}catch(e){toast(e.message)}}
  if(target.id==='priceInput'){try{const price=await api(`/api/price?value=${encodeURIComponent(target.value)}`);if(!price.value)throw new Error('Enter a valid price, for example 28.5 lakh');listing.data.priceBdt=price.value;queuePatch({priceBdt:price.value});$('#price-display').textContent=price.formatted;await flush()}catch(e){toast(e.message)}}
});
$('#step-content').addEventListener('click',async event=>{
  const target=event.target;try{
    if(target.id==='decode'){await flush();const result=await api(`/api/decode?value=${encodeURIComponent(listing.data.chassisNumber??'')}`);const node=$('#decode-result');node.innerHTML=result.candidates?.length?`<div class="info">${esc(result.status==='ambiguous'?'This code fits multiple models. Choose the correct one:':'Possible match — confirm all details:')}</div>`+result.candidates.map((c,i)=>`<div class="result-card" data-candidate="${i}"><strong>${esc(c.make.name.en)} ${esc(c.model.name.en)}</strong><br><small>${esc(c.generation.name.en)} · ${esc(c.engineCc)} cc · ${esc(c.engineCode??'')}</small></div>`).join(''):`<div class="info warn">${esc(result.status==='invalid'?result.reason:'No safe auto-match. Continue with manual selection.')}</div>`;node._candidates=result.candidates??[];}
    if(target.closest('[data-candidate]')){const node=$('#decode-result');const candidate=node._candidates[Number(target.closest('[data-candidate]').dataset.candidate)];const patch={makeId:candidate.make.id,modelId:candidate.model.id,generationId:candidate.generation.id,engineCc:candidate.engineCc,fuel:candidate.generation.specs.fuel,transmission:candidate.generation.specs.transmission,body:candidate.generation.specs.body,gradeId:null};Object.assign(listing.data,patch);queuePatch(patch);await flush();step=1;render();}
    if(target.id==='unknown-submit'){const text=$('#unknown-text').value.trim();if(!text)throw new Error('Enter the missing name');await api('/api/catalog-request','POST',{kind:$('#unknown-kind').value,text,context:{makeId:listing.data.makeId,modelId:listing.data.modelId,generationId:listing.data.generationId}});toast('Sent to the catalogue admin for mapping')}
    if(target.id==='guidance'){const d=listing.data;const g=await api(`/api/price-guidance?makeId=${encodeURIComponent(d.makeId??'')}&modelId=${encodeURIComponent(d.modelId??'')}&year=${d.manufactureYear??0}`);$('#guidance-result').innerHTML=g?`<div class="info">Median ${esc(new Intl.NumberFormat('en-IN',{style:'currency',currency:'BDT',maximumFractionDigits:0}).format(g.medianBdt))} from ${g.sampleSize} comparable live cars.</div>`:'<div class="info">Price guidance appears after at least 5 comparable CarBuy listings.</div>'}
    if(target.dataset.move){const ids=listing.photos.map(x=>x.id),i=ids.indexOf(target.dataset.move),j=i+Number(target.dataset.dir);if(j>=0&&j<ids.length){[ids[i],ids[j]]=[ids[j],ids[i]];listing=await api(`/api/listings/${listing.id}/reorder`,'POST',{ids});render()}}
    if(target.dataset.removePhoto){listing=await api(`/api/listings/${listing.id}/remove-photo`,'POST',{photoId:target.dataset.removePhoto});render()}
    if(target.id==='draft-text'){await flush();const result=await api(`/api/listings/${listing.id}/draft-description?lang=en`);listing.data.description=result.text;queuePatch({description:result.text});await flush();render()}
    if(target.id==='submit'){await flush();const result=await api(`/api/listings/${listing.id}/submit`,'POST',{});listing=result.listing;render();toast('Ready for simulated payment')}
    if(target.id==='demo-pay'){listing=await api(`/api/listings/${listing.id}/demo-pay`,'POST',{});render();toast('Payment simulated. Awaiting review.')}
    if(target.id==='demo-approve'){listing=await api(`/api/listings/${listing.id}/demo-approve`,'POST',{});render();toast('Listing approved and live')}
    if(target.id==='share'){const links=await api(`/api/listings/${listing.id}/share`);await navigator.clipboard.writeText(links.copy);toast('Demo listing link copied. This localhost link is not public.')}
    if(target.id==='sold'){listing=await api(`/api/listings/${listing.id}/sold`,'POST',{soldVia:$('#sold-via').value});render()}
    if(target.id==='withdraw'){listing=await api(`/api/listings/${listing.id}/withdraw`,'POST',{});render()}
    if(target.id==='relist-withdrawn'){listing=await api(`/api/listings/${listing.id}/relist-withdrawn`,'POST',{});render()}
    if(target.id==='relist-sold'){listing=await api(`/api/listings/${listing.id}/relist-sold`,'POST',{});step=0;render();toast('New draft created for this vehicle')}
    if(target.id==='renew'){const result=await api(`/api/listings/${listing.id}/renew`,'POST',{});listing=result.listing;render()}
  }catch(e){toast(e.message)}
});
api('/api/catalog').then(result=>{catalog={...result.catalog,values:result.values};renderHome()}).catch(error=>toast(error.message));
