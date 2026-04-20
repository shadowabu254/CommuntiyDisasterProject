import React, { useEffect, useRef, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function ChatBox({ reportId }) {
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState({});
  const boxRef = useRef();

  useEffect(()=> {
    (async ()=> {
      try {
        const res = await api.get(`/chat/report/${reportId}`);
        setMessages(res.data.map(m => ({ id: m.id, senderId: m.senderId, sender: m.sender?.name || 'User', message: m.message, createdAt: m.createdAt })));
      } catch (err) {}
    })();
  }, [reportId]);

  useEffect(()=> {
    if (!user) return;
    const s = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:8000', { withCredentials: true });
    setSocket(s);

    s.emit('presence', { userId: user.id });
    s.emit('join_report', { reportId });

    s.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      if (document.hidden) setUnread(u => u + 1);
      setTimeout(()=> { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, 50);
    });

    s.on('presence_update', ({ userId, online }) => {
      setOnline(prev => ({ ...prev, [userId]: online }));
    });

    s.on('increment_unread', ({ userId }) => {
      if (userId === user.id) setUnread(u => u + 1);
    });

    const onVisible = () => { if (!document.hidden) setUnread(0); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      s.emit('leave_report', { reportId });
      s.disconnect();
    };
  }, [user, reportId]);

  const send = () => {
    if (!text.trim() || !socket || !user) return;
    const payload = { reportId, userId: user.id, username: user.name, message: text.trim() };
    socket.emit('report_message', payload);
    setText('');
  };

  return (
    <div className="bg-white p-4 rounded shadow mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Live Chat</h3>
        <div className="flex items-center gap-3">
          {unread > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>}
          <div className="text-sm text-slate-500">Online: {Object.values(online).filter(Boolean).length}</div>
        </div>
      </div>

      <div ref={boxRef} className="h-64 overflow-y-auto p-2 flex flex-col gap-2 border rounded">
        {messages.map((m, i) => {
          const mine = user && (m.senderId === user.id || m.sender === user.name);
          return (
            <div key={i} className={`max-w-[80%] p-2 rounded ${mine ? 'ml-auto bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              <div className="text-xs opacity-70">{m.sender}</div>
              <div>{m.message}</div>
              <div className="text-[10px] opacity-50 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-3">
        <input className="flex-1 border p-2 rounded" placeholder="Type a message..." value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=> e.key === 'Enter' && send()} />
        <button onClick={send} className="bg-indigo-600 text-white px-4 rounded">Send</button>
      </div>
    </div>
  );
}
