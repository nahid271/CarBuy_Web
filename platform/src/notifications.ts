import { randomUUID } from 'node:crypto';

export type Language='en'|'bn';
export type Channel='push'|'in_app'|'email'|'sms';
export type NoticeKind='listing_status'|'new_chat'|'saved_search_match'|'saved_car_changed'|'listing_expiring'|'auction_sheet_ready'|'payment_receipt'|'low_dealer_credits';
export type Recipient={id:string;language:Language;hasApp:boolean;email?:string;phone?:string;smsOptIn:boolean};
export type Notice={id:string;eventId:string;userId:string;kind:NoticeKind;channel:Channel;title:string;body:string;createdAt:string;readAt?:string;status:'queued'|'delivered'};
const matrix:Record<NoticeKind,readonly Channel[]>={
  listing_status:['push','in_app','email','sms'],new_chat:['push','in_app','email','sms'],saved_search_match:['push','email'],
  saved_car_changed:['push','in_app','email'],listing_expiring:['push','in_app','email','sms'],
  auction_sheet_ready:['push','in_app','email','sms'],payment_receipt:['in_app','email','sms'],low_dealer_credits:['push','in_app','email','sms'],
};
const copy:Record<NoticeKind,{en:[string,string];bn:[string,string]}>= {
  listing_status:{en:['Listing update','Your listing status has changed.'],bn:['বিজ্ঞাপনের আপডেট','আপনার বিজ্ঞাপনের অবস্থা পরিবর্তিত হয়েছে।']},
  new_chat:{en:['New message','You have a new car enquiry.'],bn:['নতুন বার্তা','আপনার গাড়ি নিয়ে নতুন প্রশ্ন এসেছে।']},
  saved_search_match:{en:['New car matches','A new car matches your saved search.'],bn:['নতুন মিল পাওয়া গেছে','আপনার সংরক্ষিত খোঁজে নতুন গাড়ি মিলেছে।']},
  saved_car_changed:{en:['Saved car update','A saved car has changed price or status.'],bn:['সংরক্ষিত গাড়ির খবর','সংরক্ষিত গাড়ির দাম বা অবস্থা বদলেছে।']},
  listing_expiring:{en:['Listing expiring','Your listing will expire soon.'],bn:['বিজ্ঞাপনের মেয়াদ শেষ হচ্ছে','আপনার বিজ্ঞাপনের মেয়াদ শিগগির শেষ হবে।']},
  auction_sheet_ready:{en:['Auction sheet result','Your auction sheet result is ready.'],bn:['অকশন শিট প্রস্তুত','আপনার অকশন শিটের ফল প্রস্তুত।']},
  payment_receipt:{en:['Payment receipt','Your CarBuy receipt is ready.'],bn:['পেমেন্টের রসিদ','আপনার CarBuy রসিদ প্রস্তুত।']},
  low_dealer_credits:{en:['Low listing credits','Your dealer listing credits are running low.'],bn:['লিস্টিং ক্রেডিট কম','আপনার ডিলার লিস্টিং ক্রেডিট কমে আসছে।']},
};
export class NotificationService{
  private readonly preferences=new Map<string,boolean>();
  private readonly messages:Notice[]=[];
  private key(userId:string,kind:NoticeKind,channel:Channel){return `${userId}:${kind}:${channel}`}
  setPreference(userId:string,kind:NoticeKind,channel:Channel,enabled:boolean){
    if(!matrix[kind]?.includes(channel))throw new Error('Channel is unavailable for this notice');
    this.preferences.set(this.key(userId,kind,channel),enabled);
  }
  preferencesFor(userId:string){return Object.fromEntries(Object.entries(matrix).map(([kind,channels])=>[kind,
    Object.fromEntries(channels.map(channel=>[channel,this.preferences.get(this.key(userId,kind as NoticeKind,channel))??true]))]));}
  queue(event:{id:string;kind:NoticeKind;recipient:Recipient;at?:Date}):Notice[]{
    if(!event.id||!event.recipient.id||!matrix[event.kind])throw new Error('Invalid notice');
    const {recipient,kind}=event,language=recipient.language==='bn'?'bn':'en',wording=copy[kind][language];
    const created:Notice[]=[];
    for(const channel of matrix[kind]){
      if(channel==='push'&&!recipient.hasApp||channel==='email'&&!recipient.email||channel==='sms'&&(!recipient.phone||
        (kind==='new_chat'&&!recipient.smsOptIn)||(kind==='listing_status'&&recipient.hasApp)))continue;
      if(this.preferences.get(this.key(recipient.id,kind,channel))===false)continue;
      if(this.messages.some(x=>x.eventId===event.id&&x.channel===channel&&x.userId===recipient.id))continue;
      const notice:Notice={id:randomUUID(),eventId:event.id,userId:recipient.id,kind,channel,title:wording[0],body:wording[1],
        createdAt:(event.at??new Date()).toISOString(),status:'queued'};
      this.messages.push(notice);created.push(notice);
    }
    return created;
  }
  inbox(userId:string){return this.messages.filter(x=>x.userId===userId&&x.channel==='in_app').map(x=>structuredClone(x));}
  markRead(userId:string,id:string,at=new Date()){const row=this.messages.find(x=>x.id===id&&x.userId===userId&&x.channel==='in_app');
    if(!row)throw new Error('Notice not found');row.readAt=at.toISOString();return structuredClone(row)}
  pending(channel:Exclude<Channel,'in_app'>){return this.messages.filter(x=>x.channel===channel&&x.status==='queued').map(x=>structuredClone(x))}
  markDelivered(id:string){const row=this.messages.find(x=>x.id===id&&x.channel!=='in_app');if(!row)throw new Error('Delivery not found');row.status='delivered'}
}
