import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import client from '../api/client';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export default function ChatPage() {
    const { id } = useParams<{ id: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    async function loadHistory() {
        try {
            setLoadingHistory(true);
            const { data } = await client.get(`/subjects/${id}/chat-history`);
            setMessages(data);
        } catch (err) {
            console.error('Lỗi tải lịch sử chat:', err);
        } finally {
            setLoadingHistory(false);
        }
    }

    useEffect(() => {
        if (id) loadHistory();
    }, [id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        const query = input.trim();
        if (query.length < 3 || sending) return;

        setSending(true);
        const userMsgId = 'temp-user-' + Date.now();
        setMessages((prev) => [
            ...prev,
            { id: userMsgId, role: 'user', content: query, createdAt: new Date().toISOString() }
        ]);
        setInput('');

        try {
            const { data } = await client.post(`/subjects/${id}/ask`, { query });
            setMessages((prev) => [
                ...prev,
                {
                    id: 'ans-' + Date.now(),
                    role: 'assistant',
                    content: data.answer,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } catch (err: any) {
            const message = err.response?.status === 429
                ? 'Bạn hỏi hơi nhanh, vui lòng đợi 1 phút rồi thử lại.'
                : 'Có lỗi xảy ra, vui lòng thử lại.';
            setMessages((prev) => [
                ...prev,
                {
                    id: 'err-' + Date.now(),
                    role: 'assistant',
                    content: message,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="flex flex-col h-[80vh]">
            <Link to={`/subjects/${id}`} className="text-sm text-indigo-600 hover:underline mb-3 inline-block">
                ← Quay lại tài liệu
            </Link>

            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm p-4 mb-3 flex flex-col gap-3 border border-slate-100">
                {loadingHistory ? (
                    <p className="text-slate-400 text-sm text-center my-auto">Đang tải lịch sử trò chuyện...</p>
                ) : messages.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center my-auto">
                        Đặt câu hỏi về nội dung tài liệu đã upload trong môn học này.
                    </p>
                ) : (
                    messages.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user'
                                    ? 'bg-indigo-600 text-white self-end rounded-br-none'
                                    : 'bg-slate-100 text-slate-800 self-start rounded-bl-none'
                                }`}
                        >
                            {m.content}
                        </div>
                    ))
                )}
                {sending && (
                    <div className="text-slate-400 text-xs self-start italic bg-slate-50 px-3 py-1.5 rounded-full animate-pulse">
                        AI đang suy nghĩ trả lời...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập câu hỏi (tối thiểu 3 ký tự)..."
                    disabled={sending}
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
                <button
                    type="submit"
                    disabled={sending || input.trim().length < 3}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-40"
                >
                    Gửi
                </button>
            </form>
        </div>
    );
}