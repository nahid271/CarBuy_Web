const boot=JSON.parse(document.getElementById('messaging-bootstrap').textContent);
const seller=boot.seller,bn=boot.locale==='bn',t=(en,bd)=>bn?bd:en,$=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const suffix=seller?'?as=seller':'';
let session=null,stream=null;
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),4500)}
async function request(path,method='GET',payload){const sep=path.includes('?')?'&':'?',url=path+(seller?`${sep}as=seller`:'');
  const response=await fetch(url,{method,headers:{...(payload?{'content-type':'application/json'}:{}),...(method!=='GET'?{'x-csrf-token':session?.csrf??''}:{})},
    ...(payload?{body:JSON.stringify({...payload,trap:''})}:{})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed');return result}
async function getSession(){session=await request('/api/messaging/session');renderAccount();return session}
function renderAccount(){const el=$('account');if(session?.participant){el.innerHTML=`<strong>${seller?t('Seller','বিক্রেতা'):t('Phone-verified buyer','ফোন যাচাইকৃত ক্রেতা')}</strong><br>${esc(session.participant.id)}`;return}
  if(!session?.demo){el.textContent=t('Sign in through CarBuy identity to read messages.','বার্তা পড়তে CarBuy পরিচয়ে সাইন ইন করুন।');return}
  el.innerHTML=seller?`${t('Demo seller access','ডেমো বিক্রেতা প্রবেশ')}<br><button data-signin="demo-private">${t('Private seller','ব্যক্তিগত বিক্রেতা')}</button><button data-signin="demo-dealer">${t('Dealer','ডিলার')}</button>`:
    `${t('Demo buyer access','ডেমো ক্রেতা প্রবেশ')}<br><button data-signin="buyer">${t('Sign in as demo buyer','ডেমো ক্রেতা হিসেবে সাইন ইন')}</button>`;
}
async function signIn(id){const path=seller?'/api/messaging/demo/seller-sign-in':'/api/demo/sign-in';
  const response=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(seller?{sellerId:id}:{})});
  const result=await response.json();if(!response.ok)throw new Error(result.error);await getSession();await refresh();}
function threadHref(id){return `${bn?'/bn':''}/chat/${encodeURIComponent(id)}${suffix}`}
async function refreshList(){if(!session?.participant)return;
  const rows=await request('/api/messaging/conversations'),el=$('thread-list');
  el.innerHTML=rows.length?rows.map(x=>`<a class="thread-card ${x.conversation.id===boot.threadId?'active':''}" href="${threadHref(x.conversation.id)}"><b>${t('Car enquiry','গাড়ির অনুসন্ধান')} · ${esc(x.conversation.listingId)}</b><span>${esc(x.lastMessage?.risk==='held'?t('Message held for review','বার্তা পর্যালোচনাধীন'):x.lastMessage?.kind==='image'?t('Photo shared','ছবি শেয়ার করা হয়েছে'):x.lastMessage?.text??t('Conversation started','কথোপকথন শুরু হয়েছে'))}</span><small>${x.leads.length} ${t('contact events','যোগাযোগের ঘটনা')} · ${new Date(x.conversation.updatedAt).toLocaleDateString(bn?'bn-BD':'en-BD')}</small></a>`).join(''):
    `<p class="sub">${t('No conversations yet. Open a car and tap Chat.','এখনো কোনো কথোপকথন নেই। গাড়ির পেজে Chat চাপুন।')}</p>`;
  const leads=await request('/api/messaging/leads');$('lead-list').innerHTML=`<h2>${t('Contact activity','যোগাযোগের তথ্য')}</h2>`+
    (leads.length?leads.slice(0,20).map(x=>`<div class="lead-card"><strong>${esc(x.channel.toUpperCase())} · ${esc(x.listingId)}</strong><small>${new Date(x.at).toLocaleString(bn?'bn-BD':'en-BD')}</small></div>`).join(''):
      `<p class="sub">${t('No buyer contacts yet.','এখনো কোনো ক্রেতার যোগাযোগ নেই।')}</p>`);
}
function renderMessages(data){const box=$('messages');box.replaceChildren();
  for(const message of data.messages){const mine=message.senderId===session.participant.id,item=document.createElement('article');
    item.className=`message ${mine?'mine':''} ${message.risk==='warn'?'warn':''} ${message.risk==='held'?'held':''}`;
    if(message.kind==='image'){const image=document.createElement('img');image.src=`/api/messaging/conversations/${encodeURIComponent(boot.threadId)}/image/${encodeURIComponent(message.attachmentId)}${suffix}`;
      image.alt=t('Shared car photo','শেয়ার করা গাড়ির ছবি');item.append(image)}else{const content=document.createElement('div');content.textContent=message.text;item.append(content)}
    const meta=document.createElement('small');meta.textContent=`${mine?t('You','আপনি'):seller?t('Buyer','ক্রেতা'):t('Seller','বিক্রেতা')} · ${new Date(message.createdAt).toLocaleString(bn?'bn-BD':'en-BD')}`;
    item.append(meta);
    if(message.risk==='held'){const warning=document.createElement('small');warning.textContent=t('Held for safety review. The recipient cannot see this message.','নিরাপত্তা পর্যালোচনায় আটকানো। প্রাপক এই বার্তা দেখতে পাচ্ছেন না।');item.append(warning)}
    if(message.risk==='warn'){const warning=document.createElement('small');warning.textContent=t('Caution: this message contains an external link.','সতর্কতা: এই বার্তায় বাইরের লিংক আছে।');item.append(warning)}
    box.append(item)}
  if(!data.messages.length){const empty=document.createElement('p');empty.className='no-messages';empty.textContent=t('Say hello. Ask about the car, papers or a viewing.','শুভেচ্ছা জানান। গাড়ি, কাগজপত্র বা দেখার সময় সম্পর্কে জিজ্ঞেস করুন।');box.append(empty)}
  box.scrollTop=box.scrollHeight;
  const blocked=data.conversation.blockedBy.length>0;$('message-input').disabled=blocked;$('attach').disabled=blocked;
  document.querySelector('.send').disabled=blocked;
  if(blocked)toast(t('This conversation is blocked.','এই কথোপকথন ব্লক করা হয়েছে।'));
}
async function refreshThread(){if(!boot.threadId||!session?.participant)return;
  const data=await request(`/api/messaging/conversations/${boot.threadId}`);
  $('empty').hidden=true;$('thread').hidden=false;
  const car=await request(`/api/detail/${encodeURIComponent(data.conversation.listingId)}`).catch(()=>null);
  $('car-title').textContent=car?.kind==='detail'?car.detail.title:data.conversation.listingId;
  $('car-link').href=`${bn?'/bn':''}/car/${encodeURIComponent(data.conversation.listingId)}`;
  renderMessages(data);
  if(!stream){stream=new EventSource(`/api/messaging/conversations/${boot.threadId}/events${suffix}`);
    stream.addEventListener('update',()=>{refreshThread().catch(e=>toast(e.message));refreshList().catch(()=>{})});
    stream.addEventListener('open',()=>refreshThread().catch(()=>{}));}
}
async function refresh(){await refreshList();await refreshThread()}
document.addEventListener('click',event=>{const button=event.target.closest('[data-signin]');if(button)signIn(button.dataset.signin).catch(e=>toast(e.message));
  const quick=event.target.closest('[data-quick]');if(quick){const choices=bn?{available:'গাড়িটি কি এখনো আছে?',papers:'কাগজপত্র দেখতে পারি?',price:'সর্বনিম্ন দাম কত?'}:
    {available:'Is it available?',papers:'Can I see the papers?',price:'What is your best price?'};
    $('message-input').value=choices[quick.dataset.quick];$('message-input').focus()}});
$('composer').addEventListener('submit',async event=>{event.preventDefault();if(!boot.threadId)return;
  const input=$('message-input'),value=input.value;if(!value.trim())return;
  try{await request(`/api/messaging/conversations/${boot.threadId}/messages`,'POST',{text:value});input.value='';await refreshThread();await refreshList()}
  catch(error){toast(error.message)}});
$('attach').addEventListener('click',()=>$('image-input').click());
$('image-input').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file||!boot.threadId)return;
  if(file.size>6*1024*1024){toast(t('Image must be under 6 MB.','ছবি ৬ এমবির কম হতে হবে।'));return}
  try{const bytesBase64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Image could not be read'));reader.readAsDataURL(file)});
    await request(`/api/messaging/conversations/${boot.threadId}/images`,'POST',{bytesBase64});await refreshThread();await refreshList()}
  catch(error){toast(error.message)}finally{event.target.value=''}});
$('block').addEventListener('click',async()=>{if(!confirm(t('Block this conversation? Neither side will be able to send more messages.','এই কথোপকথন ব্লক করবেন? কেউ আর বার্তা পাঠাতে পারবে না।')))return;
  try{await request(`/api/messaging/conversations/${boot.threadId}/block`,'POST',{});await refreshThread()}catch(error){toast(error.message)}});
$('report').addEventListener('click',()=>$('report-dialog').showModal());
$('submit-report').addEventListener('click',async event=>{event.preventDefault();try{await request(`/api/messaging/conversations/${boot.threadId}/report`,'POST',
  {reason:$('reason').value,note:$('note').value});$('report-dialog').close();toast(t('Report received.','রিপোর্ট পাওয়া গেছে।'))}catch(error){toast(error.message)}});
getSession().then(refresh).catch(error=>toast(error.message));
