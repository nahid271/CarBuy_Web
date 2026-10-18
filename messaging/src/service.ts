import { randomUUID } from 'node:crypto';
import type { ListingStore } from '../../listings/src/types.ts';
import { assessMessage } from './risk.ts';
import type { AlertPort, BotCheckPort, Channel, Conversation, Message, MessagingStore, Participant } from './types.ts';

const copy=<T>(x:T):T=>structuredClone(x);
const hour=3_600_000;
export class MessageError extends Error{readonly status:number;constructor(status:number,message:string){super(message);this.status=status}}
export class MessagingService{
  private readonly args:{store:MessagingStore;listings:ListingStore;alerts?:AlertPort;bot?:BotCheckPort;clock?:()=>Date};
  private readonly listeners=new Map<string,Set<()=>void>>();
  private readonly online=new Map<string,number>();
  private readonly limits=new Map<string,number[]>();
  constructor(args:{store:MessagingStore;listings:ListingStore;alerts?:AlertPort;bot?:BotCheckPort;clock?:()=>Date}){this.args=args}
  private now(){return (this.args.clock??(()=>new Date()))()}
  private limit(id:string,action:string,max:number,windowMs=hour){
    const key=`${id}:${action}`,now=this.now().getTime(),values=(this.limits.get(key)??[]).filter(x=>now-x<windowMs);
    if(values.length>=max)throw new MessageError(429,'Too many requests. Please try again later');
    values.push(now);this.limits.set(key,values);
  }
  private async bot(actor:Participant,proof:string,action:'message'|'contact'|'reveal'){
    if(this.args.bot&&!await this.args.bot.verify(actor,proof,action))throw new MessageError(403,'Bot check failed');
  }
  private buyer(actor:Participant){if(actor.role!=='buyer')throw new MessageError(403,'Buyer account required');
    if(!actor.phoneVerified)throw new MessageError(403,'Verify your phone to continue')}
  private async listing(id:string){const row=(await this.args.listings.read()).listings.find(x=>x.id===id);
    if(!row)throw new MessageError(404,'Car not found');return row}
  private async conversation(id:string,actor:Participant){const row=(await this.args.store.read()).conversations.find(x=>x.id===id);
    if(!row)throw new MessageError(404,'Conversation not found');
    if(actor.role==='buyer'?row.buyerId!==actor.id:row.sellerId!==actor.id)throw new MessageError(403,'Conversation access denied');
    return row}
  private emit(id:string){for(const fn of this.listeners.get(id)??[])fn()}
  subscribe(id:string,actor:Participant,fn:()=>void):Promise<()=>void>{return this.conversation(id,actor).then(()=>{
    if((this.online.get(actor.id)??0)>=5)throw new MessageError(429,'Too many live connections');
    let set=this.listeners.get(id);if(!set){set=new Set();this.listeners.set(id,set)}set.add(fn);
    this.online.set(actor.id,(this.online.get(actor.id)??0)+1);
    return ()=>{set!.delete(fn);if(!set!.size)this.listeners.delete(id);const count=(this.online.get(actor.id)??1)-1;
      if(count>0)this.online.set(actor.id,count);else this.online.delete(actor.id)};
  })}
  async open(actor:Participant,listingId:string,proof=''){
    this.buyer(actor);await this.bot(actor,proof,'contact');this.limit(actor.id,'open',20);
    const listing=await this.listing(listingId);
    if(listing.status!=='live'||(listing.expiresAt&&Date.parse(listing.expiresAt)<=this.now().getTime()))throw new MessageError(410,'Car is no longer available');
    if(listing.sellerId===actor.id)throw new MessageError(400,'Cannot message your own listing');
    const existing=(await this.args.store.read()).conversations.find(x=>x.listingId===listingId&&x.buyerId===actor.id);
    if(existing){if(existing.blockedBy.length)throw new MessageError(403,'This conversation is blocked');return existing}
    const at=this.now().toISOString();
    return this.args.store.transaction(state=>{
      const again=state.conversations.find(x=>x.listingId===listingId&&x.buyerId===actor.id);if(again)return again;
      const row:Conversation={id:randomUUID(),listingId,buyerId:actor.id,sellerId:listing.sellerId,
        createdAt:at,updatedAt:at,blockedBy:[]};state.conversations.push(row);
      state.leads.push({id:randomUUID(),listingId,buyerId:actor.id,sellerId:listing.sellerId,channel:'chat',conversationId:row.id,at});
      return row;
    });
  }
  async contact(actor:Participant,listingId:string,channel:Channel,proof=''){
    this.buyer(actor);if(!['chat','call','whatsapp'].includes(channel))throw new MessageError(400,'Invalid channel');
    if(channel==='chat')return this.open(actor,listingId,proof);
    await this.bot(actor,proof,'contact');this.limit(actor.id,'contact',12);
    const listing=await this.listing(listingId);
    if(listing.status!=='live'||(listing.expiresAt&&Date.parse(listing.expiresAt)<=this.now().getTime()))throw new MessageError(410,'Car is no longer available');
    const conversation=(await this.args.store.read()).conversations.find(x=>x.listingId===listingId&&x.buyerId===actor.id);
    if(conversation?.blockedBy.length)throw new MessageError(403,'This seller cannot be contacted');
    const at=this.now().toISOString();
    await this.args.store.transaction(state=>{state.leads.push({id:randomUUID(),listingId,buyerId:actor.id,
      sellerId:listing.sellerId,channel,conversationId:conversation?.id,at})});
    return {ok:true};
  }
  async reveal(actor:Participant,listingId:string,proof=''){
    this.buyer(actor);await this.bot(actor,proof,'reveal');this.limit(actor.id,'reveal',6);
    const listing=await this.listing(listingId);if(listing.status!=='live')throw new MessageError(410,'Car is no longer available');
  }
  async send(actor:Participant,id:string,text:string,proof=''){
    if(actor.role==='buyer')this.buyer(actor);await this.bot(actor,proof,'message');this.limit(actor.id,'message',30);
    const conversation=await this.conversation(id,actor);
    if(conversation.blockedBy.length)throw new MessageError(403,'This conversation is blocked');
    const clean=text.trim();if(clean.length<1||clean.length>2000)throw new MessageError(400,'Message must be 1–2,000 characters');
    const risk=assessMessage(clean),at=this.now().toISOString();
    const message:Message={id:randomUUID(),conversationId:id,senderId:actor.id,kind:'text',text:clean,
      risk:risk.risk,riskReasons:risk.reasons,createdAt:at};
    await this.args.store.transaction(state=>{state.messages.push(message);const row=state.conversations.find(x=>x.id===id)!;row.updatedAt=at});
    if(message.risk!=='held'){this.emit(id);await this.notify(conversation,actor.id)}
    return message;
  }
  async image(actor:Participant,id:string,attachmentId:string){
    if(actor.role==='buyer')this.buyer(actor);this.limit(actor.id,'image',6);
    const conversation=await this.conversation(id,actor);if(conversation.blockedBy.length)throw new MessageError(403,'This conversation is blocked');
    const attachment=(await this.args.store.read()).attachments.find(x=>x.id===attachmentId&&x.conversationId===id&&x.uploaderId===actor.id);
    if(!attachment)throw new MessageError(404,'Image not found');
    const message:Message={id:randomUUID(),conversationId:id,senderId:actor.id,kind:'image',text:'',attachmentId,
      risk:'clear',riskReasons:[],createdAt:this.now().toISOString()};
    await this.args.store.transaction(state=>{if(state.messages.some(x=>x.attachmentId===attachmentId))throw new MessageError(409,'Image already sent');
      state.messages.push(message);state.conversations.find(x=>x.id===id)!.updatedAt=message.createdAt});
    this.emit(id);await this.notify(conversation,actor.id);return message;
  }
  async authorizeImage(actor:Participant,id:string){
    if(actor.role==='buyer')this.buyer(actor);const row=await this.conversation(id,actor);
    if(row.blockedBy.length)throw new MessageError(403,'This conversation is blocked');
  }
  async registerImage(actor:Participant,id:string,privateKey:string){
    if(actor.role==='buyer')this.buyer(actor);const row=await this.conversation(id,actor);
    if(row.blockedBy.length)throw new MessageError(403,'This conversation is blocked');
    const attachment={id:randomUUID(),conversationId:id,uploaderId:actor.id,privateKey,mimeType:'image/webp' as const,
      createdAt:this.now().toISOString()};
    await this.args.store.transaction(state=>{state.attachments.push(attachment)});return attachment;
  }
  async attachment(actor:Participant,id:string,attachmentId:string){
    await this.conversation(id,actor);const state=await this.args.store.read();
    const row=state.attachments.find(x=>x.id===attachmentId&&x.conversationId===id);
    const message=state.messages.find(x=>x.attachmentId===attachmentId);
    if(!row||!message||message.risk==='held'&&message.senderId!==actor.id)throw new MessageError(404,'Image not found');return row;
  }
  async thread(actor:Participant,id:string){
    const row=await this.conversation(id,actor),state=await this.args.store.read();
    if(actor.role==='seller')await this.args.store.transaction(s=>{const current=s.conversations.find(x=>x.id===id)!;current.lastSellerOpenedAt=this.now().toISOString()});
    return {conversation:row,messages:state.messages.filter(x=>x.conversationId===id&&(x.risk!=='held'||x.senderId===actor.id))};
  }
  async inbox(actor:Participant){if(actor.role==='buyer')this.buyer(actor);
    const state=await this.args.store.read(),rows=state.conversations.filter(x=>actor.role==='buyer'?x.buyerId===actor.id:x.sellerId===actor.id);
    return rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(x=>({conversation:x,
      lastMessage:state.messages.filter(m=>m.conversationId===x.id&&(m.risk!=='held'||m.senderId===actor.id)).at(-1)??null,
      leads:state.leads.filter(l=>l.conversationId===x.id)}));
  }
  async leads(actor:Participant){if(actor.role==='buyer')this.buyer(actor);
    const state=await this.args.store.read();return state.leads.filter(x=>actor.role==='buyer'?x.buyerId===actor.id:x.sellerId===actor.id)
      .sort((a,b)=>b.at.localeCompare(a.at));
  }
  async block(actor:Participant,id:string){const row=await this.conversation(id,actor);
    await this.args.store.transaction(state=>{const current=state.conversations.find(x=>x.id===row.id)!;
      if(!current.blockedBy.includes(actor.id))current.blockedBy.push(actor.id)});this.emit(id);return {blocked:true};
  }
  async report(actor:Participant,id:string,reason:'scam'|'abuse'|'spam'|'other',note=''){
    await this.conversation(id,actor);if(!['scam','abuse','spam','other'].includes(reason)||note.length>1000)throw new MessageError(400,'Invalid report');
    const report={id:randomUUID(),conversationId:id,reporterId:actor.id,reason,note:note.trim(),createdAt:this.now().toISOString()};
    await this.args.store.transaction(state=>{state.reports.push(report)});return {id:report.id,status:'received'};
  }
  async responseHours(sellerId:string):Promise<number|null>{const state=await this.args.store.read(),hours:number[]=[];
    for(const c of state.conversations.filter(x=>x.sellerId===sellerId)){
      const messages=state.messages.filter(x=>x.conversationId===c.id&&x.risk!=='held').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      const first=messages.findIndex(x=>x.senderId===c.buyerId),buyer=first>=0?messages[first]:undefined,
        reply=buyer&&messages.slice(first+1).find(x=>x.senderId===sellerId);
      if(buyer&&reply)hours.push(Math.max(0,(Date.parse(reply.createdAt)-Date.parse(buyer.createdAt))/hour));
    }
    if(!hours.length)return null;hours.sort((a,b)=>a-b);return Math.round(hours[Math.floor((hours.length-1)/2)]*10)/10;
  }
  private async notify(conversation:Conversation,senderId:string){
    const recipientId=senderId===conversation.buyerId?conversation.sellerId:conversation.buyerId;
    if(this.online.get(recipientId))return;
    const target=await this.args.alerts?.target(recipientId);if(!target)return;
    const now=this.now().getTime(),state=await this.args.store.read();
    if(state.notifications.some(x=>x.conversationId===conversation.id&&x.recipientId===recipientId&&now-Date.parse(x.createdAt)<15*60_000))return;
    const channel:'push'|'sms'|'email'|null=target.pushEnabled&&target.pushToken?'push':target.smsOptIn&&target.phone?'sms':target.emailOptIn&&target.email?'email':null;
    if(!channel)return;
    const notification={id:randomUUID(),conversationId:conversation.id,recipientId,channel,status:'queued' as const,createdAt:this.now().toISOString()};
    await this.args.store.transaction(s=>{s.notifications.push(notification)});
    const text='You have a new CarBuy message. Sign in to reply.';
    try{
      if(channel==='push'&&this.args.alerts?.push)await this.args.alerts.push(target.pushToken!,text);
      else if(channel==='sms'&&this.args.alerts?.sms)await this.args.alerts.sms(target.phone!,text);
      else if(channel==='email'&&this.args.alerts?.email)await this.args.alerts.email(target.email!,text);
      else return;
      await this.args.store.transaction(s=>{s.notifications.find(x=>x.id===notification.id)!.status='sent'});
    }catch{await this.args.store.transaction(s=>{s.notifications.find(x=>x.id===notification.id)!.status='failed'})}
  }
  async dispatchSellerFallbacks(){
    const now=this.now().getTime(),state=await this.args.store.read();
    for(const initial of state.notifications.filter(x=>x.channel==='push'&&now-Date.parse(x.createdAt)>=15*60_000)){
      const conversation=state.conversations.find(x=>x.id===initial.conversationId);
      if(!conversation||initial.recipientId!==conversation.sellerId||this.online.get(initial.recipientId)||
        conversation.lastSellerOpenedAt&&Date.parse(conversation.lastSellerOpenedAt)>=Date.parse(initial.createdAt))continue;
      if(state.notifications.some(x=>x.conversationId===initial.conversationId&&x.recipientId===initial.recipientId&&
        x.createdAt>=initial.createdAt&&x.channel!=='push'))continue;
      const target=await this.args.alerts?.target(initial.recipientId);
      const channel=target?.smsOptIn&&target.phone?'sms':target?.emailOptIn&&target.email?'email':null;
      if(!channel)continue;
      const notification={id:randomUUID(),conversationId:initial.conversationId,recipientId:initial.recipientId,
        channel:channel as 'sms'|'email',status:'queued' as const,createdAt:this.now().toISOString()};
      await this.args.store.transaction(s=>{if(!s.notifications.some(x=>x.conversationId===initial.conversationId&&
        x.recipientId===initial.recipientId&&x.channel===channel&&x.createdAt>=initial.createdAt))s.notifications.push(notification)});
      try{if(channel==='sms'&&this.args.alerts?.sms)await this.args.alerts.sms(target!.phone!,'You have a new CarBuy message. Sign in to reply.');
        else if(channel==='email'&&this.args.alerts?.email)await this.args.alerts.email(target!.email!,'You have a new CarBuy message. Sign in to reply.');
        else continue;
        await this.args.store.transaction(s=>{const row=s.notifications.find(x=>x.id===notification.id);if(row)row.status='sent'});
      }catch{await this.args.store.transaction(s=>{const row=s.notifications.find(x=>x.id===notification.id);if(row)row.status='failed'})}
    }
  }
}
