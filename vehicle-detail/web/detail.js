const boot=JSON.parse(document.getElementById('detail-bootstrap').textContent);
const detail=boot.detail,locale=boot.locale,bn=locale==='bn';
const t=(en,bd)=>bn?bd:en,$=id=>document.getElementById(id);
const photos=detail.photos.map(x=>`/media/public/${encodeURIComponent(x.webpKey)}`);
let photoIndex=0,zoom=1,translated=false,translationText=null,session=null;
const notify=message=>{const toast=$('toast');toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),4500)};
async function sessionInfo(){if(!session){const response=await fetch('/api/detail/session');session=await response.json()}return session}
async function ensureBuyer(){let current=await sessionInfo();if(current.viewer)return current;
  if(!current.demo){notify(t('Sign in and verify your phone to continue.','এগোতে সাইন ইন ও ফোন যাচাই করুন।'));throw new Error('Sign-in required')}
  if(!confirm(t('Use the fake, phone-verified demo buyer account? No real account is created.','নকল, ফোন-যাচাইকৃত ডেমো ক্রেতা অ্যাকাউন্ট ব্যবহার করবেন? আসল অ্যাকাউন্ট তৈরি হবে না।')))throw new Error('Cancelled');
  const response=await fetch('/api/demo/sign-in',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  if(!response.ok)throw new Error((await response.json()).error);session=await response.json();notify(t('Signed in as demo buyer.','ডেমো ক্রেতা হিসেবে সাইন ইন হয়েছে।'));return session;
}
async function post(action,payload={}){const current=await ensureBuyer();const response=await fetch(`/api/detail/${encodeURIComponent(detail.id)}/${action}`,{
  method:'POST',headers:{'content-type':'application/json','x-csrf-token':current.csrf},body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Action failed');return result}
async function run(action){try{await action()}catch(error){if(error.message!=='Cancelled'&&error.message!=='Sign-in required')notify(error.message||'Please try again')}}
function showPhoto(index){if(!photos.length)return;photoIndex=(index+photos.length)%photos.length;
  if($('main-image'))$('main-image').src=photos[photoIndex];
  $('lightbox-image').src=photos[photoIndex];$('lightbox-count').textContent=`${photoIndex+1} / ${photos.length}`;
  const count=document.querySelector('.photo-count');if(count)count.textContent=`${photoIndex+1} / ${photos.length}`;
  zoom=1;$('lightbox-image').style.transform='scale(1)';}
function openLightbox(index){showPhoto(index);$('lightbox').showModal()}
function safeArray(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}}
function saveArray(key,list){try{localStorage.setItem(key,JSON.stringify(list))}catch{}}
function setup(){
  const recent=safeArray('carbuy:recent').filter(id=>id!==detail.id);recent.unshift(detail.id);saveArray('carbuy:recent',recent.slice(0,12));
  const saved=safeArray('carbuy:saved-cars').includes(detail.id);$('save-car').textContent=saved?`♥ ${t('Saved','সংরক্ষিত')}`:`♡ ${t('Save','সংরক্ষণ')}`;
  $('save-car').addEventListener('click',()=>{let ids=safeArray('carbuy:saved-cars');ids=ids.includes(detail.id)?ids.filter(x=>x!==detail.id):[detail.id,...ids].slice(0,200);
    saveArray('carbuy:saved-cars',ids);$('save-car').textContent=ids.includes(detail.id)?`♥ ${t('Saved','সংরক্ষিত')}`:`♡ ${t('Save','সংরক্ষণ')}`});
  $('share-car').addEventListener('click',()=>run(async()=>{const url=location.href;
    if(navigator.share){await navigator.share({title:detail.title,url})}else{await navigator.clipboard.writeText(url);notify(t('Link copied.','লিংক কপি হয়েছে।'))}}));
  $('gallery-main').addEventListener('click',()=>openLightbox(photoIndex));$('all-photos').addEventListener('click',()=>openLightbox(photoIndex));
  document.querySelectorAll('[data-photo]').forEach(button=>button.addEventListener('click',()=>openLightbox(Number(button.dataset.photo))));
  $('lightbox-close').addEventListener('click',()=>$('lightbox').close());$('photo-prev').addEventListener('click',()=>showPhoto(photoIndex-1));
  $('photo-next').addEventListener('click',()=>showPhoto(photoIndex+1));
  $('zoom-in').addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);$('lightbox-image').style.transform=`scale(${zoom})`});
  $('zoom-out').addEventListener('click',()=>{zoom=Math.max(1,zoom-.25);$('lightbox-image').style.transform=`scale(${zoom})`});
  let touchX=0;$('lightbox').addEventListener('touchstart',e=>{touchX=e.changedTouches[0].clientX},{passive:true});
  $('lightbox').addEventListener('touchend',e=>{const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>50)showPhoto(photoIndex+(delta<0?1:-1))},{passive:true});
  document.addEventListener('keydown',e=>{if(!$('lightbox').open)return;if(e.key==='ArrowRight')showPhoto(photoIndex+1);if(e.key==='ArrowLeft')showPhoto(photoIndex-1)});
  $('translate').addEventListener('click',()=>run(async()=>{if(translated){$('description').textContent=detail.description.text;
      $('translate').textContent=`⇄ ${t('Translate','অনুবাদ করুন')}`;$('translation-note').textContent='';translated=false;return}
    if(!translationText){const to=detail.description.language==='en'?'bn':'en';const response=await fetch(`/api/detail/${detail.id}/translate?to=${to}`);
      const result=await response.json();if(!response.ok)throw new Error(result.error);translationText=result.text}
    $('description').textContent=translationText;$('translate').textContent=`⇄ ${t('Original','মূল লেখা')}`;
    $('translation-note').textContent=t('Auto-translated; check important details with the seller.','স্বয়ংক্রিয় অনুবাদ; গুরুত্বপূর্ণ তথ্য বিক্রেতার সাথে মিলিয়ে নিন।');translated=true}));
  $('reveal-chassis').addEventListener('click',()=>run(async()=>{const result=await post('chassis');$('chassis-value').textContent=result.chassisNumber;
    $('reveal-chassis').disabled=true;notify(t('Chassis reveal was logged.','চেসিস নম্বর দেখার ঘটনা লগ হয়েছে।'))}));
  for(const channel of ['chat','call','whatsapp']){const button=$(channel);if(!button)continue;
    button.addEventListener('click',()=>run(async()=>{const result=await post('contact',{channel});
      if(result.url)location.href=result.url;else notify(t('Chat is unavailable. Please try again.','চ্যাট পাওয়া যাচ্ছে না। আবার চেষ্টা করুন।'))}))}
  $('report-car').addEventListener('click',()=>$('report-dialog').showModal());
  $('submit-report').addEventListener('click',e=>{e.preventDefault();run(async()=>{await post('report',{reason:$('report-reason').value,note:$('report-note').value});
    $('report-dialog').close();notify(t('Thank you. Your report was recorded.','ধন্যবাদ। আপনার রিপোর্ট সংরক্ষিত হয়েছে।'))})});
  const verify=$('verify-auction');if(verify)verify.addEventListener('click',()=>run(async()=>{
    const order=await post('auction-verification');
    if((await sessionInfo()).demo){
      if(confirm(t(`This is a fake checkout for ৳${order.amountBdt}. Complete the demo payment?`,`এটি ৳${order.amountBdt} টাকার নকল চেকআউট। ডেমো পেমেন্ট সম্পন্ন করবেন?`))){
        const response=await fetch('/api/demo/verification-pay',{method:'POST',headers:{'content-type':'application/json','x-csrf-token':session.csrf},body:JSON.stringify({orderId:order.id})});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
        notify(t('Demo payment recorded. Verification is now requested.','ডেমো পেমেন্ট সংরক্ষিত। যাচাইয়ের অনুরোধ করা হয়েছে।'));verify.disabled=true;verify.textContent=t('Verification requested','যাচাইয়ের অনুরোধ করা হয়েছে')}
    }else if(order.checkoutUrl){location.href=order.checkoutUrl}else notify(t('Checkout unavailable.','চেকআউট পাওয়া যাচ্ছে না।'))}));
}
setup();
