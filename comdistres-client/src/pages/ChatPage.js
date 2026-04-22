import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  Search, Send, Paperclip, X, Check, CheckCheck, Phone, Video,
  MoreVertical, Edit2, Settings, LogOut, Smile, ArrowLeft,
  MessageSquare, Reply, Copy, Trash2, Star, Download, Loader,
  Mic, StopCircle, Forward, Pin, BellOff, Bell, Info, RefreshCw,
  AlertCircle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000';

// ─── Helpers ───────────────────────────────────────────────────────────────
const getAvatar = (name) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name||'U')}&backgroundColor=0f172a&fontFamily=Helvetica&fontSize=38&textColor=94a3b8`;

const ROLE = {
  1:{label:'Admin',       color:'text-purple-400',  bg:'bg-purple-500/15 border-purple-500/30' },
  2:{label:'Coordinator', color:'text-blue-400',    bg:'bg-blue-500/15   border-blue-500/30'   },
  3:{label:'Volunteer',   color:'text-emerald-400', bg:'bg-emerald-500/15 border-emerald-500/30'},
  4:{label:'Citizen',     color:'text-slate-400',   bg:'bg-slate-500/15  border-slate-500/30'  },
};
const getRole = (r) => ROLE[r] || ROLE[4];

const fmtTime = (d) => {
  if (!d) return '';
  const dt=new Date(d),now=new Date(),diff=now-dt;
  if(diff<60000)    return 'now';
  if(diff<3600000)  return `${Math.floor(diff/60000)}m`;
  if(diff<86400000) return dt.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'});
  if(diff<604800000)return dt.toLocaleDateString('en-KE',{weekday:'short'});
  return dt.toLocaleDateString('en-KE',{month:'short',day:'numeric'});
};
const fmtMsgTime=(d)=>d?new Date(d).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}):'';
const fmtDivider=(d)=>{
  const dt=new Date(d),now=new Date(),diff=now-dt;
  if(diff<86400000&&now.getDate()===dt.getDate())return 'Today';
  if(diff<172800000)return 'Yesterday';
  return dt.toLocaleDateString('en-KE',{weekday:'long',month:'long',day:'numeric'});
};
const groupByDate=(msgs)=>{
  const out=[];let last=null;
  msgs.forEach(m=>{
    const d=new Date(m.createdAt).toDateString();
    if(d!==last){out.push({type:'divider',date:m.createdAt});last=d;}
    out.push({type:'msg',data:m});
  });
  return out;
};
const fsize=(b)=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${(b/1024).toFixed(0)} KB`;
const EMOJIS=['😀','😂','❤️','👍','👎','😢','😮','🔥','🙏','✅','❌','⚠️','📍','🚨','💬','🏥','🌊','🚗','😊','👋','🤝','👮','🚒','🚑','📻','🗺️','⛑️','🆘','💯','🎯'];

// ─── Sub-components ─────────────────────────────────────────────────────────
function EmojiPicker({onSelect,onClose}){
  return(
    <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-slate-700 rounded-2xl p-3 shadow-2xl z-50 w-64" onClick={e=>e.stopPropagation()}>
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map(e=>(
          <button key={e} onClick={()=>{onSelect(e);onClose();}}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-700 rounded-lg transition">{e}</button>
        ))}
      </div>
    </div>
  );
}

function MsgMenu({msg,isSent,isStarred,onReply,onCopy,onDelete,onStar,onClose}){
  return(
    <div className={`absolute ${isSent?'right-full mr-2':'left-full ml-2'} top-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 min-w-[160px]`}
      onClick={e=>e.stopPropagation()}>
      {[
        {icon:Reply, label:'Reply',               fn:()=>{onReply(msg);onClose();}},
        {icon:Copy,  label:'Copy text',            fn:()=>{navigator.clipboard?.writeText(msg.message||'');onClose();}},
        {icon:Star,  label:isStarred?'Unstar':'Star', fn:()=>{onStar(msg);onClose();}},
        {icon:Pin,   label:'Pin',                  fn:()=>onClose()},
        {icon:Forward,label:'Forward',             fn:()=>onClose()},
        ...(isSent?[{icon:Trash2,label:'Delete',fn:()=>{onDelete(msg);onClose();},danger:true}]:[]),
      ].map(({icon:Icon,label,fn,danger})=>(
        <button key={label} onClick={fn}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-700 transition text-left ${danger?'text-red-400':'text-slate-300'}`}>
          <Icon className="w-4 h-4"/>{label}
        </button>
      ))}
    </div>
  );
}

function useVoice(){
  const [recording,setRecording]=useState(false);
  const [audioUrl, setAudioUrl] =useState(null);
  const [duration, setDuration] =useState(0);
  const mediaRef =useRef(null);
  const chunksRef=useRef([]);
  const timerRef =useRef(null);

  const start=async()=>{
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>chunksRef.current.push(e.data);
      mr.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:'audio/webm'});
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();
      mediaRef.current=mr;
      setRecording(true);
      setDuration(0);
      timerRef.current=setInterval(()=>setDuration(d=>d+1),1000);
    }catch{alert('Microphone access denied');}
  };
  const stop  =()=>{mediaRef.current?.stop();setRecording(false);clearInterval(timerRef.current);};
  const cancel=()=>{mediaRef.current?.stop();setRecording(false);setAudioUrl(null);setDuration(0);clearInterval(timerRef.current);};
  return{recording,audioUrl,duration,start,stop,cancel,setAudioUrl};
}

// ══════════════════════════════════════════════════════════════════════════
export default function ChatPage(){
  const {user,logout}=useContext(AuthContext);

  const [socket,         setSocket]         =useState(null);
  const [connected,      setConnected]      =useState(false);
  const [contacts,       setContacts]       =useState([]);
  const [selected,       setSelected]       =useState(null);
  const [messages,       setMessages]       =useState([]);
  const [input,          setInput]          =useState('');
  const [search,         setSearch]         =useState('');
  const [msgSearch,      setMsgSearch]      =useState('');
  const [showMsgSearch,  setShowMsgSearch]  =useState(false);
  const [online,         setOnline]         =useState([]);
  const [typing,         setTyping]         =useState({});
  const [unread,         setUnread]         =useState({});
  const [loading,        setLoading]        =useState(true);
  const [msgLoading,     setMsgLoading]     =useState(false);
  const [file,           setFile]           =useState(null);
  const [showEmoji,      setShowEmoji]      =useState(false);
  const [menu,           setMenu]           =useState(null);
  const [replyTo,        setReplyTo]        =useState(null);
  const [starred,        setStarred]        =useState(new Set());
  const [showProfile,    setShowProfile]    =useState(false);
  const [showEdit,       setShowEdit]       =useState(false);
  const [showInfo,       setShowInfo]       =useState(false);
  const [profile,        setProfile]        =useState({name:'',email:'',phone:'',address:'',bio:''});
  const [mobileChat,     setMobileChat]     =useState(false);
  const [muted,          setMuted]          =useState(new Set());

  const endRef     =useRef(null);
  const fileRef    =useRef(null);
  const inputRef   =useRef(null);
  const typingTimer=useRef(null);

  // ── Refs that socket callbacks always read fresh ──────────────────────
  const selectedRef=useRef(null);  // currently open conversation partner
  const mutedRef   =useRef(new Set());
  const myIdRef    =useRef(null);  // logged-in user's numeric id

  useEffect(()=>{selectedRef.current=selected;},[selected]);
  useEffect(()=>{mutedRef.current=muted;},[muted]);
  useEffect(()=>{if(user)myIdRef.current=Number(user.id);},[user]);

  const voice=useVoice();

  // ── Socket setup — created once ───────────────────────────────────────
  useEffect(()=>{
    if(!user)return;
    const myId=Number(user.id);

    const sock=io(SOCKET_URL,{
      transports:['websocket','polling'],
      reconnection:true,
      reconnectionAttempts:Infinity,
      reconnectionDelay:1000,
      reconnectionDelayMax:5000,
    });

    sock.on('connect',()=>{
      setConnected(true);
      sock.emit('join',myId);
      console.log('✓ Socket connected:',sock.id);
    });
    sock.on('disconnect',()=>setConnected(false));
    sock.on('connect_error',e=>console.warn('Socket error:',e.message));
    sock.on('presence',users=>setOnline((Array.isArray(users)?users:[]).map(Number)));

    // ── receiveMessage ──────────────────────────────────────────────────
    // Server sends this to the RECEIVER when someone sends them a message.
    // The SENDER gets messageSent instead.
    // So here we only handle messages where I am the receiver.
    sock.on('receiveMessage',(msg)=>{
      const sId=Number(msg.senderId);
      const rId=Number(msg.receiverId);

      // Safety: only process if I am the actual receiver
      if(rId!==myId)return;

      const sc=selectedRef.current;
      // Is the sender the person whose chat I currently have open?
      const chatIsOpen=sc&&Number(sc.id)===sId;

      if(chatIsOpen){
        // Append to messages (guard duplicate)
        setMessages(prev=>{
          if(prev.some(m=>m.id&&m.id===msg.id))return prev;
          return [...prev,{...msg,status:'delivered'}];
        });
        // Mark as read immediately
        sock.emit('markAsRead',{messageIds:[msg.id]});
      }else{
        // Background — show unread badge (unless muted)
        if(!mutedRef.current.has(sId)){
          setUnread(u=>({...u,[sId]:(u[sId]||0)+1}));
        }
      }

      // Always update sidebar preview
      setContacts(prev=>prev.map(c=>
        Number(c.id)===sId
          ?{...c,lastMessage:msg.message||'📎 File',lastMessageTime:new Date(msg.createdAt)}
          :c
      ));
    });

    // ── messageSent ─────────────────────────────────────────────────────
    // Server sends this back to the SENDER to confirm save + delivery status.
    // We use tempId to find the optimistic bubble and replace it.
    sock.on('messageSent',(msg)=>{
      if(!msg.tempId)return;
      setMessages(prev=>
        prev.map(m=>m.tempId===msg.tempId?{...msg}:m)
      );
      // Update sidebar for sender
      setContacts(prev=>prev.map(c=>
        Number(c.id)===Number(msg.receiverId)
          ?{...c,lastMessage:msg.message||'📎 File',lastMessageTime:new Date(msg.createdAt)}
          :c
      ));
    });

    // ── messagesRead ─────────────────────────────────────────────────────
    sock.on('messagesRead',({messageIds})=>{
      setMessages(prev=>prev.map(m=>messageIds.includes(m.id)?{...m,status:'read'}:m));
    });

    // ── userTyping ────────────────────────────────────────────────────────
    sock.on('userTyping',({userId,isTyping})=>{
      const uid=Number(userId);
      setTyping(prev=>({...prev,[uid]:isTyping}));
      if(isTyping)setTimeout(()=>setTyping(prev=>({...prev,[uid]:false})),3000);
    });

    // ── messageError ──────────────────────────────────────────────────────
    sock.on('messageError',({tempId})=>{
      if(!tempId)return;
      setMessages(prev=>prev.map(m=>m.tempId===tempId?{...m,status:'error'}:m));
    });

    setSocket(sock);
    return()=>sock.disconnect();
  },[user]);

  // ── Load contacts ─────────────────────────────────────────────────────
  const loadContacts=useCallback(async()=>{
    if(!user)return;
    try{
      const res=await api.get('s').catch(()=>api.get('/users'));
      const others=(res.data||[]).filter(u=>Number(u.id)!==Number(user.id));
      const enriched=await Promise.all(others.map(async c=>{
        try{
          const r=await api.get(`/chat/conversation/${user.id}/${c.id}`);
          const msgs=Array.isArray(r.data)?r.data:[];
          const last=msgs[msgs.length-1];
          return{...c,
            lastMessage:last?(last.message||'📎 File'):null,
            lastMessageTime:last?new Date(last.createdAt):new Date(0),
          };
        }catch{return{...c,lastMessage:null,lastMessageTime:new Date(0)};}
      }));
      enriched.sort((a,b)=>b.lastMessageTime-a.lastMessageTime);
      setContacts(enriched);
    }catch(e){console.error('loadContacts:',e);}
    finally{setLoading(false);}
  },[user]);

  const loadProfile=useCallback(async()=>{
    try{
      const r=await api.get('/auth/me');
      setProfile({name:r.data.name||'',email:r.data.email||'',phone:r.data.phone||'',address:r.data.address||'',bio:r.data.bio||''});
    }catch{}
  },[]);

  useEffect(()=>{loadContacts();loadProfile();},[loadContacts,loadProfile]);

  // ── Load messages when selected contact changes ───────────────────────
  useEffect(()=>{
    if(!selected||!user)return;
    const load=async()=>{
      setMsgLoading(true);
      try{
        const r=await api.get(`/chat/conversation/${user.id}/${selected.id}`);
        const msgs=Array.isArray(r.data)?r.data:[];
        setMessages(msgs);
        // Mark unread messages from this contact as read
        const unreadIds=msgs
          .filter(m=>Number(m.senderId)===Number(selected.id)&&m.status!=='read')
          .map(m=>m.id);
        if(unreadIds.length&&socket)socket.emit('markAsRead',{messageIds:unreadIds});
      }catch{setMessages([]);}
      finally{setMsgLoading(false);}
    };
    load();
    // Clear this contact's unread badge
    setUnread(u=>({...u,[Number(selected.id)]:0}));
    setReplyTo(null);
    setMsgSearch('');
    setShowMsgSearch(false);
  },[selected?.id]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  // ── Send message ──────────────────────────────────────────────────────
  const send=()=>{
    if((!input.trim()&&!file&&!voice.audioUrl)||!selected||!socket||!connected)return;

    const tempId=`tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const payload={
      tempId,
      senderId:   Number(user.id),
      receiverId: Number(selected.id),
      message:    input.trim()||null,
      fileUrl:    file?.url||voice.audioUrl||null,
      fileName:   file?.name||(voice.audioUrl?'Voice.webm':null),
      fileType:   file?.type||(voice.audioUrl?'audio/webm':null),
      replyToId:  replyTo?.id||null,
      replyTo:    replyTo||null,
    };

    // Optimistic bubble — shown immediately, replaced when messageSent fires
    const optimistic={
      ...payload,
      id:null,
      status:'sending',
      createdAt:new Date().toISOString(),
    };
    setMessages(prev=>[...prev,optimistic]);
    setInput('');setFile(null);setReplyTo(null);voice.setAudioUrl(null);

    socket.emit('sendMessage',payload);
    clearTimeout(typingTimer.current);
    socket.emit('typing',{receiverId:Number(selected.id),isTyping:false});
    inputRef.current?.focus();
  };

  const handleTyping=(val)=>{
    setInput(val);
    if(!socket||!selected||!connected)return;
    socket.emit('typing',{receiverId:Number(selected.id),isTyping:true});
    clearTimeout(typingTimer.current);
    typingTimer.current=setTimeout(()=>
      socket.emit('typing',{receiverId:Number(selected.id),isTyping:false}),1500);
  };

  const handleFile=(e)=>{
    const f=e.target.files?.[0];if(!f)return;
    if(f.size>10*1024*1024){alert('Max 10MB');return;}
    const reader=new FileReader();
    reader.onload=ev=>setFile({name:f.name,type:f.type,size:f.size,url:ev.target.result});
    reader.readAsDataURL(f);
    e.target.value='';
  };

  const deleteMsg  =(msg)=>setMessages(p=>p.filter(m=>m.tempId!==msg.tempId&&m.id!==msg.id));
  const toggleStar =(msg)=>setStarred(p=>{const n=new Set(p);const k=msg.id||msg.tempId;n.has(k)?n.delete(k):n.add(k);return n;});
  const toggleMute =(id) =>setMuted(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const saveProfile=async()=>{
    try{await api.put('/auth/profile',profile);setShowEdit(false);loadProfile();}
    catch(e){alert('Failed: '+(e.response?.data?.error||e.message));}
  };
  const retrySend=(msg)=>{
    if(!socket||!connected)return;
    const newTempId=`tmp_${Date.now()}_retry`;
    setMessages(prev=>prev.map(m=>m.tempId===msg.tempId?{...m,tempId:newTempId,status:'sending'}:m));
    socket.emit('sendMessage',{...msg,tempId:newTempId,status:undefined,id:undefined});
  };

  const filteredContacts=contacts.filter(c=>
    c.name?.toLowerCase().includes(search.toLowerCase())||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMessages=msgSearch
    ?messages.filter(m=>m.message?.toLowerCase().includes(msgSearch.toLowerCase()))
    :messages;
  const groups=groupByDate(filteredMessages);
  const totalUnread=Object.values(unread).reduce((s,n)=>s+n,0);

  if(!user)return(<><Navbar/><div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-slate-400">Please log in.</p></div></>);
  if(loading)return(
    <><Navbar/>
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"/>
          <div className="absolute inset-2 rounded-full border-4 border-t-blue-500 border-transparent animate-spin"/>
        </div>
        <p className="text-slate-400 text-sm">Loading chats…</p>
      </div>
    </div></>
  );

  return(<><Navbar/>

    {/* Profile */}
    {showProfile&&(
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setShowProfile(false)}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h3 className="font-bold text-white">My Profile</h3>
            <button onClick={()=>setShowProfile(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-center">
              <img src={getAvatar(user.name)} alt="" className="w-20 h-20 rounded-full mx-auto ring-4 ring-blue-500/30 mb-3"/>
              <h4 className="text-lg font-bold text-white">{profile.name||user.name}</h4>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRole(user.role).bg} ${getRole(user.role).color}`}>{getRole(user.role).label}</span>
            </div>
            {[['Email',profile.email],['Phone',profile.phone],['Bio',profile.bio]].filter(x=>x[1]).map(([l,v])=>(
              <div key={l} className="bg-slate-800 rounded-xl p-3"><p className="text-xs text-slate-500 mb-0.5">{l}</p><p className="text-sm text-slate-200">{v}</p></div>
            ))}
            <div className="flex gap-3">
              <button onClick={()=>{setShowProfile(false);setShowEdit(true);}}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition">
                <Edit2 className="w-4 h-4"/>Edit Profile
              </button>
              <button onClick={()=>{logout();setShowProfile(false);}}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition border border-red-500/20">
                <LogOut className="w-4 h-4"/>Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Edit profile */}
    {showEdit&&(
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setShowEdit(false)}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h3 className="font-bold text-white">Edit Profile</h3>
            <button onClick={()=>setShowEdit(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
            {[{k:'name',l:'Name',t:'text'},{k:'email',l:'Email',t:'email'},{k:'phone',l:'Phone',t:'tel'},{k:'address',l:'Address',t:'text'}].map(({k,l,t})=>(
              <div key={k}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</label>
                <input type={t} value={profile[k]} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Bio</label>
              <textarea value={profile.bio} onChange={e=>setProfile(p=>({...p,bio:e.target.value}))} rows={3}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setShowEdit(false)} className="flex-1 py-2.5 border border-slate-700 text-slate-400 rounded-xl text-sm hover:bg-slate-800 transition">Cancel</button>
              <button onClick={saveProfile} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition">Save</button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Contact info */}
    {showInfo&&selected&&(
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={()=>setShowInfo(false)}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <h3 className="font-bold text-white">Contact Info</h3>
            <button onClick={()=>setShowInfo(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5"/></button>
          </div>
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="relative inline-block">
                <img src={getAvatar(selected.name)} alt="" className="w-24 h-24 rounded-full mb-3"/>
                {online.includes(Number(selected.id))&&<span className="absolute bottom-3 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"/>}
              </div>
              <h4 className="text-xl font-bold text-white">{selected.name}</h4>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRole(selected.role).bg} ${getRole(selected.role).color}`}>{getRole(selected.role).label}</span>
              <p className="text-sm text-slate-400 mt-2">{online.includes(Number(selected.id))?'🟢 Online':'⚫ Offline'}</p>
            </div>
            {[['Email',selected.email],['Phone',selected.phone]].filter(x=>x[1]).map(([l,v])=>(
              <div key={l} className="bg-slate-800 rounded-xl p-3"><p className="text-xs text-slate-500 mb-0.5">{l}</p><p className="text-sm text-slate-200">{v}</p></div>
            ))}
            <button onClick={()=>toggleMute(Number(selected.id))}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition border ${muted.has(Number(selected.id))?'bg-amber-500/10 border-amber-500/30 text-amber-400':'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
              {muted.has(Number(selected.id))?<><Bell className="w-4 h-4"/>Unmute</>:<><BellOff className="w-4 h-4"/>Mute Notifications</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Main */}
    <div className="flex h-screen bg-slate-950 pt-16" onClick={()=>{setShowEmoji(false);setMenu(null);}}>

      {/* Sidebar */}
      <div className={`${mobileChat?'hidden':'flex'} md:flex w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0`}>
        <div className="px-4 pt-4 pb-3 border-b border-slate-800 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={()=>setShowProfile(true)} className="relative group flex-shrink-0">
              <img src={getAvatar(user.name)} alt="" className="w-10 h-10 rounded-full ring-2 ring-slate-700 group-hover:ring-blue-500 transition"/>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${connected?'bg-emerald-500':'bg-amber-500 animate-pulse'}`}/>
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{user.name}</p>
              <p className={`text-xs ${connected?'text-emerald-400':'text-amber-400'}`}>{connected?'● Connected':'● Connecting…'}</p>
            </div>
            <div className="flex items-center gap-1">
              {totalUnread>0&&<span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full animate-pulse">{totalUnread}</span>}
              <button onClick={loadContacts} title="Refresh" className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-300 transition"><RefreshCw className="w-4 h-4"/></button>
              <button onClick={()=>setShowProfile(true)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-300 transition"><Settings className="w-4 h-4"/></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length===0?(
            <div className="text-center py-16 text-slate-600">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">No contacts found</p>
            </div>
          ):filteredContacts.map(c=>{
            const u=unread[Number(c.id)]||0;
            const isOnline=online.includes(Number(c.id));
            const isTyping=typing[Number(c.id)];
            const isActive=selected&&Number(selected.id)===Number(c.id);
            const isMuted=muted.has(Number(c.id));
            return(
              <button key={c.id} onClick={()=>{setSelected(c);setMobileChat(true);}}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-slate-800/50 hover:bg-slate-800/60 transition text-left ${isActive?'bg-blue-600/10 border-l-2 border-l-blue-500':''}`}>
                <div className="relative flex-shrink-0">
                  <img src={getAvatar(c.name)} alt="" className="w-12 h-12 rounded-full"/>
                  {isOnline&&<span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-semibold truncate ${u?'text-white':'text-slate-300'}`}>{c.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {isMuted&&<BellOff className="w-3 h-3 text-slate-600"/>}
                      <span className="text-xs text-slate-600">{c.lastMessageTime>new Date(1000)?fmtTime(c.lastMessageTime):''}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate flex-1 ${isTyping?'text-blue-400 italic':u?'text-slate-300 font-medium':'text-slate-500'}`}>
                      {isTyping?'typing…':c.lastMessage||'Start a conversation'}
                    </p>
                    {u>0&&!isMuted&&(
                      <span className="min-w-[20px] h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 flex-shrink-0">{u}</span>
                    )}
                  </div>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getRole(c.role).bg} ${getRole(c.role).color}`}>{getRole(c.role).label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat */}
      <div className={`${!mobileChat?'hidden':'flex'} md:flex flex-1 flex-col min-w-0`}>
        {selected?(
          <>
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
              <button onClick={()=>setMobileChat(false)} className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 flex-shrink-0"><ArrowLeft className="w-5 h-5"/></button>
              <button onClick={()=>setShowInfo(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition">
                <div className="relative flex-shrink-0">
                  <img src={getAvatar(selected.name)} alt="" className="w-10 h-10 rounded-full"/>
                  {online.includes(Number(selected.id))&&<span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"/>}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm">{selected.name}</p>
                  <p className={`text-xs ${typing[Number(selected.id)]?'text-blue-400':online.includes(Number(selected.id))?'text-emerald-400':'text-slate-500'}`}>
                    {typing[Number(selected.id)]?'● typing…':online.includes(Number(selected.id))?'● Online':'Offline'}
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={()=>setShowMsgSearch(s=>!s)}
                  className={`p-2 rounded-xl transition ${showMsgSearch?'bg-blue-600/20 text-blue-400':'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Search className="w-4 h-4"/>
                </button>
                <button onClick={()=>toggleMute(Number(selected.id))}
                  className={`p-2 rounded-xl transition ${muted.has(Number(selected.id))?'text-amber-400 bg-amber-500/10':'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  {muted.has(Number(selected.id))?<BellOff className="w-4 h-4"/>:<Bell className="w-4 h-4"/>}
                </button>
                <button onClick={()=>setShowInfo(true)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition"><Info className="w-4 h-4"/></button>
              </div>
            </div>

            {/* Message search */}
            {showMsgSearch&&(
              <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
                <Search className="w-4 h-4 text-slate-500 flex-shrink-0"/>
                <input value={msgSearch} onChange={e=>setMsgSearch(e.target.value)} placeholder="Search in this conversation…" autoFocus
                  className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 text-sm focus:outline-none"/>
                {msgSearch&&<button onClick={()=>setMsgSearch('')} className="text-slate-500 hover:text-slate-300"><X className="w-4 h-4"/></button>}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-950"
              style={{backgroundImage:'radial-gradient(ellipse at 15% 50%,rgba(30,58,138,0.05) 0%,transparent 60%)'}}>
              {msgLoading&&<div className="flex justify-center py-12"><Loader className="w-6 h-6 text-slate-700 animate-spin"/></div>}
              {!msgLoading&&groups.length===0&&(
                <div className="flex flex-col items-center justify-center h-full text-slate-700 py-20">
                  <div className="w-16 h-16 bg-slate-800/60 rounded-full flex items-center justify-center mb-3">
                    <MessageSquare className="w-8 h-8 opacity-30"/>
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs mt-1 opacity-60">Say hello to {selected.name}!</p>
                </div>
              )}

              {groups.map((item,idx)=>{
                if(item.type==='divider')return(
                  <div key={`d${idx}`} className="flex items-center gap-3 py-4">
                    <div className="flex-1 h-px bg-slate-800"/>
                    <span className="text-[11px] text-slate-600 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 font-medium">{fmtDivider(item.date)}</span>
                    <div className="flex-1 h-px bg-slate-800"/>
                  </div>
                );

                const msg     =item.data;
                // isSent: true if I sent this message
                const isSent  =Number(msg.senderId)===Number(user.id);
                const key     =msg.tempId||(msg.id?`id_${msg.id}`:Math.random());
                const isStarred=starred.has(msg.id||msg.tempId);
                const isSending=msg.status==='sending';
                const isError  =msg.status==='error';
                const highlight=msgSearch&&msg.message?.toLowerCase().includes(msgSearch.toLowerCase());

                return(
                  <div key={key} className={`flex ${isSent?'justify-end':'justify-start'} group relative mb-1`}>
                    <div className={`flex items-end gap-2 max-w-[72%] ${isSent?'flex-row-reverse':''}`}>
                      {!isSent&&(
                        <img src={getAvatar(selected.name)} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mb-1 opacity-60"/>
                      )}
                      <div className="relative">
                        {/* Reply preview */}
                        {msg.replyTo&&(
                          <div className={`mb-1 px-3 py-1.5 rounded-xl text-xs border-l-2 max-w-xs ${isSent?'bg-blue-700/25 border-blue-400/60 text-blue-200':'bg-slate-700/50 border-slate-500 text-slate-400'}`}>
                            <p className="font-semibold mb-0.5 text-[11px] uppercase tracking-wide opacity-70">
                              {Number(msg.replyTo.senderId)===Number(user.id)?'You':selected.name}
                            </p>
                            <p className="truncate">{msg.replyTo.message||'📎 File'}</p>
                          </div>
                        )}

                        {/* Bubble */}
                        <div onContextMenu={e=>{e.preventDefault();setMenu({msg,isSent});}}
                          className={`relative px-4 py-2.5 rounded-2xl cursor-pointer transition-all ${highlight?'ring-2 ring-yellow-400':''} ${
                            isSent
                              ?`bg-blue-600 text-white rounded-br-sm ${isSending?'opacity-60':''} ${isError?'!bg-red-700':''}`
                              :'bg-slate-800 text-slate-200 rounded-bl-sm'
                          }`}>

                          {msg.fileUrl&&msg.fileType?.startsWith('image/')&&(
                            <img src={msg.fileUrl} alt="" className="max-w-xs rounded-xl max-h-64 object-cover mb-2"/>
                          )}
                          {msg.fileUrl&&msg.fileType?.startsWith('audio/')&&(
                            <div className="mb-2 flex items-center gap-2">
                              <Mic className="w-4 h-4 flex-shrink-0"/>
                              <audio src={msg.fileUrl} controls className="max-w-[200px] h-8"/>
                            </div>
                          )}
                          {msg.fileUrl&&!msg.fileType?.startsWith('image/')&&!msg.fileType?.startsWith('audio/')&&(
                            <a href={msg.fileUrl} download={msg.fileName}
                              className={`flex items-center gap-2 p-2 rounded-lg text-sm mb-2 ${isSent?'bg-blue-700/50 hover:bg-blue-700/80':'bg-slate-700/50 hover:bg-slate-700/80'} transition`}>
                              <Paperclip className="w-4 h-4 flex-shrink-0"/>
                              <span className="truncate max-w-[180px] text-xs">{msg.fileName}</span>
                              <Download className="w-4 h-4 flex-shrink-0"/>
                            </a>
                          )}

                          {msg.message&&(
                            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${highlight?'bg-yellow-400/20 rounded px-0.5':''}`}>{msg.message}</p>
                          )}
                          {isStarred&&<Star className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-yellow-400 fill-current"/>}
                        </div>

                        {/* Time + ticks */}
                        <div className={`flex items-center gap-1 mt-0.5 ${isSent?'justify-end':'justify-start'}`}>
                          <span className="text-[10px] text-slate-600">{fmtMsgTime(msg.createdAt)}</span>
                          {isSent&&(
                            isError?(
                              <button onClick={()=>retrySend(msg)} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition">
                                <AlertCircle className="w-3 h-3"/>Failed · tap to retry
                              </button>
                            ):
                            isSending?<Loader className="w-3 h-3 text-slate-600 animate-spin"/>:
                            msg.status==='read'     ?<CheckCheck className="w-3 h-3 text-blue-400"/>:
                            msg.status==='delivered'?<CheckCheck className="w-3 h-3 text-slate-500"/>:
                            <Check className="w-3 h-3 text-slate-600"/>
                          )}
                        </div>

                        {/* Context menu */}
                        {menu?.msg===msg&&(
                          <MsgMenu msg={msg} isSent={isSent} isStarred={isStarred}
                            onReply={m=>{setReplyTo(m);setMenu(null);inputRef.current?.focus();}}
                            onCopy={()=>setMenu(null)}
                            onDelete={m=>{deleteMsg(m);setMenu(null);}}
                            onStar={m=>toggleStar(m)}
                            onClose={()=>setMenu(null)}/>
                        )}
                      </div>

                      {/* Hover quick-actions */}
                      <div className={`opacity-0 group-hover:opacity-100 transition flex items-center gap-1 mb-2 ${isSent?'flex-row-reverse':''}`}>
                        <button onClick={()=>{setReplyTo(msg);inputRef.current?.focus();}}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-300 transition" title="Reply">
                          <Reply className="w-3.5 h-3.5"/>
                        </button>
                        <button onClick={()=>toggleStar(msg)}
                          className={`p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition ${isStarred?'text-yellow-400':'text-slate-500 hover:text-slate-300'}`} title="Star">
                          <Star className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typing[Number(selected.id)]&&(
                <div className="flex justify-start mt-2">
                  <div className="flex items-end gap-2">
                    <img src={getAvatar(selected.name)} alt="" className="w-7 h-7 rounded-full opacity-60"/>
                    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      {[0,1,2].map(i=>(
                        <span key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef}/>
            </div>

            {/* Reply banner */}
            {replyTo&&(
              <div className="px-4 py-2 bg-slate-800/90 border-t border-slate-700 flex items-center gap-3 flex-shrink-0">
                <div className="w-1 h-10 bg-blue-500 rounded-full flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-400 font-semibold">Replying to {Number(replyTo.senderId)===Number(user.id)?'yourself':selected.name}</p>
                  <p className="text-xs text-slate-400 truncate">{replyTo.message||'📎 File'}</p>
                </div>
                <button onClick={()=>setReplyTo(null)} className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X className="w-4 h-4"/></button>
              </div>
            )}

            {/* File preview */}
            {file&&(
              <div className="px-4 py-2 bg-slate-800/90 border-t border-slate-700 flex items-center gap-3 flex-shrink-0">
                {file.type.startsWith('image/')
                  ?<img src={file.url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0"/>
                  :<div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0"><Paperclip className="w-5 h-5 text-slate-400"/></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{fsize(file.size)}</p>
                </div>
                <button onClick={()=>setFile(null)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0"><X className="w-4 h-4"/></button>
              </div>
            )}

            {/* Voice recording */}
            {voice.recording&&(
              <div className="px-4 py-3 bg-red-900/20 border-t border-red-800/40 flex items-center gap-3 flex-shrink-0">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"/>
                <span className="text-red-400 text-sm font-semibold flex-1">Recording… {voice.duration}s</span>
                <button onClick={voice.cancel} className="px-3 py-1.5 text-slate-400 hover:text-slate-200 text-sm transition">Cancel</button>
                <button onClick={voice.stop} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition flex items-center gap-2">
                  <StopCircle className="w-4 h-4"/>Stop
                </button>
              </div>
            )}

            {/* Voice preview */}
            {voice.audioUrl&&!voice.recording&&(
              <div className="px-4 py-2 bg-slate-800/90 border-t border-slate-700 flex items-center gap-3 flex-shrink-0">
                <Mic className="w-5 h-5 text-blue-400 flex-shrink-0"/>
                <audio src={voice.audioUrl} controls className="flex-1 h-8"/>
                <button onClick={()=>voice.setAudioUrl(null)} className="text-slate-500 hover:text-red-400 transition"><X className="w-4 h-4"/></button>
              </div>
            )}

            {/* Input */}
            <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 flex-shrink-0">
              <div className="flex items-end gap-2">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"/>
                <button onClick={()=>fileRef.current?.click()}
                  className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-200 transition flex-shrink-0" title="Attach">
                  <Paperclip className="w-5 h-5"/>
                </button>
                <div className="relative flex-shrink-0">
                  <button onClick={e=>{e.stopPropagation();setShowEmoji(s=>!s);}}
                    className={`p-2.5 rounded-xl transition ${showEmoji?'bg-blue-600/20 text-blue-400':'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                    <Smile className="w-5 h-5"/>
                  </button>
                  {showEmoji&&<EmojiPicker onSelect={e=>{setInput(i=>i+e);inputRef.current?.focus();}} onClose={()=>setShowEmoji(false)}/>}
                </div>
                <textarea ref={inputRef} value={input} onChange={e=>handleTyping(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
                  placeholder={connected?'Type a message…':'Connecting to server…'}
                  rows={1}
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none max-h-32 overflow-y-auto leading-relaxed"
                  style={{minHeight:'44px'}}/>
                {(input.trim()||file||voice.audioUrl)?(
                  <button onClick={send} disabled={!connected}
                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-600 text-white rounded-2xl transition flex-shrink-0">
                    <Send className="w-5 h-5"/>
                  </button>
                ):(
                  <button onMouseDown={voice.start} onMouseUp={voice.stop}
                    onTouchStart={voice.start} onTouchEnd={voice.stop}
                    disabled={!connected} title="Hold to record"
                    className={`p-3 rounded-2xl transition flex-shrink-0 ${voice.recording?'bg-red-600 text-white':'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-40'}`}>
                    <Mic className="w-5 h-5"/>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-700 mt-1.5 text-center select-none">
                Enter to send · Shift+Enter new line · Right-click bubble for options · Hold 🎤 to record
              </p>
            </div>
          </>
        ):(
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-center p-8">
            <div className="w-24 h-24 bg-slate-800/40 rounded-full flex items-center justify-center mb-5 border border-slate-700/50">
              <MessageSquare className="w-12 h-12 text-slate-700"/>
            </div>
            <h2 className="text-2xl font-black text-slate-300 mb-2 tracking-tight">CDRS Messaging</h2>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">Secure real-time communication for your disaster response team.</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {['Real-time delivery','Read receipts','File sharing','Voice messages','Reply','Search','Typing indicators','Online presence'].map(f=>(
                <span key={f} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-500">{f}</span>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected?'bg-emerald-500':'bg-amber-500 animate-pulse'}`}/>
              <span className="text-xs text-slate-600">{connected?'Connected to chat server':'Connecting to chat server…'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  </>);
}