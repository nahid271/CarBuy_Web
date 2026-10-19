import type { CatalogSnapshot } from '../../vehicle-data/src/types.ts';
import type { DealerService } from './service.ts';

export type PublicProfile = Awaited<ReturnType<DealerService['publicProfile']>>;
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));

// Anonymous HTML carries no phone numbers or call/WhatsApp links (D11, MSG-04).
// Each car's buttons ask revealUrl, which needs a signed-in, phone-verified
// buyer and records the lead before it returns the number.
export function renderShowroomPage(profile:PublicProfile,snapshot:CatalogSnapshot,options:{revealUrl:string;notice?:string}):string{
  const modelName=(id?:string)=>snapshot.models.find(x=>x.id===id)?.name.en??id??'Model';
  const makeName=(id?:string)=>snapshot.makes.find(x=>x.id===id)?.name.en??id??'Vehicle';
  const cards=profile.stock.map(car=>`<article class="panel" style="padding:0;overflow:hidden">
    <div style="height:160px;background:#e2ede4;display:grid;place-items:center">${car.coverKey?`<img src="/media/public/${escapeHtml(car.coverKey)}" alt="${escapeHtml(makeName(car.makeId))} ${escapeHtml(modelName(car.modelId))}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:50px;color:#6e9e7c">◈</span>'}</div>
    <div style="padding:17px"><span class="pill">${escapeHtml(car.stockStatus==='preorder'?'Pre-order':'Ready')}</span><h2 style="margin:11px 0 4px">${escapeHtml(makeName(car.makeId))} ${escapeHtml(modelName(car.modelId))}</h2><p class="smalltext muted">${escapeHtml(car.year)} · ${escapeHtml(car.stockNumber)} · ${escapeHtml(car.area)}, ${escapeHtml(car.district)}</p><b style="font-size:18px">৳${Number(car.priceBdt??0).toLocaleString('en-BD')}</b>${car.expectedArrival?`<p class="smalltext">Expected ${escapeHtml(car.expectedArrival)}</p>`:''}
    <div class="form-actions" style="margin-top:14px"><button class="button secondary small" type="button" data-reveal="call" data-listing="${escapeHtml(car.id)}">Call</button><button class="button secondary small" type="button" data-reveal="whatsapp" data-listing="${escapeHtml(car.id)}">WhatsApp</button></div><p class="smalltext" data-reveal-result="${escapeHtml(car.id)}" aria-live="polite"></p></div></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(profile.name)} · CarBuy</title><link rel="stylesheet" href="/styles.css"></head><body>
    <header class="topbar"><a class="brand" href="/"><span class="brand-mark">C<span>›</span></span><span>CarBuy <small>VERIFIED DEALER</small></span></a><span class="demo-badge">LOCAL DEMO</span></header>
    <main class="main" style="max-width:1050px" data-org="${escapeHtml(profile.id)}" data-reveal-url="${escapeHtml(options.revealUrl)}">${options.notice?`<div class="notice warn">${escapeHtml(options.notice)}</div>`:''}<div class="hero" style="margin-bottom:20px"><div style="display:flex;gap:18px;align-items:center">${profile.logoKey!=='demo'?`<img class="brandlogo" src="/media/public/${escapeHtml(profile.logoKey)}" alt="${escapeHtml(profile.name)} logo">`:''}<div><span class="pill">✓ Verified dealer</span><h1 style="margin:10px 0 5px;font-size:30px">${escapeHtml(profile.name)}</h1><p>${escapeHtml(profile.address)}, ${escapeHtml(profile.district)}</p></div></div></div>
    <div class="two-col" style="grid-template-columns:1fr 1fr"><section class="panel"><h2>Visit the showroom</h2><p>${escapeHtml(profile.address)}, ${escapeHtml(profile.district)}</p><p class="smalltext muted">${escapeHtml(profile.hours)}</p><div class="form-actions"><a class="button" href="${escapeHtml(profile.mapUrl)}" target="_blank" rel="noopener noreferrer">Open map ↗</a></div><p class="smalltext muted">Call or WhatsApp the showroom from any car below. Numbers are shown after you sign in with a verified phone.</p></section><section class="panel"><h2>About us</h2><p class="smalltext muted">${escapeHtml(profile.about)}</p><p class="smalltext muted">Verified on ${escapeHtml(profile.verifiedAt.slice(0,10))}.</p></section></div>
    <div class="page-head" style="margin-top:16px"><div><div class="eyebrow">Showroom inventory</div><h2>${profile.stock.length} live cars</h2><p class="sub">Current stock from this verified dealer.</p></div></div><div class="cards">${cards||'<div class="empty"><strong>No live cars yet</strong>Check back for new arrivals.</div>'}</div></main>
    <script>
      const page=document.querySelector('main');
      document.addEventListener('click',async event=>{
        const button=event.target.closest('[data-reveal]');if(!button)return;
        const out=document.querySelector('[data-reveal-result="'+CSS.escape(button.dataset.listing)+'"]');button.disabled=true;
        try{
          const res=await fetch(page.dataset.revealUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({orgId:page.dataset.org,listingId:button.dataset.listing,channel:button.dataset.reveal})});
          const body=await res.json();if(!res.ok)throw new Error(body.error||'Could not show the number');
          const link=document.createElement('a');link.href=body.href;link.textContent=body.phone;
          if(body.channel==='whatsapp'){link.target='_blank';link.rel='noopener noreferrer'}
          out.replaceChildren(body.channel==='call'?'Call ':'WhatsApp ',link);
        }catch(error){out.textContent=error.message}finally{button.disabled=false}
      });
    </script></body></html>`;
}
