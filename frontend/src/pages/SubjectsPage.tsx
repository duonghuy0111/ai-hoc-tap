import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

interface Subject {
    id: string;
    name: string;
    description?: string;
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function loadSubjects() {
        try {
            setError(null);
            const { data } = await client.get('/subjects');
            setSubjects(data);
        } catch (err) {
            console.error('Lỗi tải danh sách môn học:', err);
            setError('Không thể tải danh sách môn học. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSubjects();
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        setCreating(true);
        try {
            await client.post('/subjects', {
                name: name.trim(),
                description: description.trim()
            });
            setName('');
            setDescription('');
            await loadSubjects();
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Tạo môn học thất bại');
        } finally {
            setCreating(false);
        }
    }

    function startEdit(s: Subject) {
        setEditingId(s.id);
        setEditName(s.name);
        setEditDescription(s.description ?? '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditDescription('');
    }

    async function handleSaveEdit(id: string) {
        if (!editName.trim()) return;
        setSaving(true);
        try {
            await client.patch(`/subjects/${id}`, {
                name: editName.trim(),
                description: editDescription.trim(),
            });
            cancelEdit();
            await loadSubjects();
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Cập nhật môn học thất bại');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string, name: string) {
        const confirmed = window.confirm(
            `Xoá môn học "${name}"? Toàn bộ tài liệu, bài kiểm tra và lịch sử hỏi đáp của môn học này sẽ bị xoá vĩnh viễn, không thể khôi phục.`
        );
        if (!confirmed) return;

        setDeletingId(id);
        try {
            await client.delete(`/subjects/${id}`);
            await loadSubjects();
        } catch (err: any) {
            alert(err.response?.data?.message ?? 'Xoá môn học thất bại');
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-semibold text-slate-800">Môn học của bạn</h1>

            {/* Form tạo môn học mới */}
            <form
                onSubmit={handleCreate}
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3"
            >
                <input
                    type="text"
                    placeholder="Tên môn học (ví dụ: Giải tích 1)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={creating}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                    required
                />
                <input
                    type="text"
                    placeholder="Mô tả ngắn (tùy chọn)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={creating}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
                <button
                    type="submit"
                    disabled={creating || !name.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                    {creating ? 'Đang tạo...' : 'Tạo môn học'}
                </button>
            </form>

            {/* Trạng thái Loading / Lỗi / Danh sách */}
            {loading ? (
                <p className="text-slate-400 text-sm text-center py-10">Đang tải danh sách môn học...</p>
            ) : error ? (
                <p className="text-red-500 text-sm text-center py-10">{error}</p>
            ) : subjects.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm text-center space-y-1">
                    <p className="text-slate-600 font-medium text-sm">Chưa có môn học nào</p>
                    <p className="text-xs text-slate-400">Hãy nhập tên môn học phía trên để bắt đầu tải tài liệu & ôn tập bài làm.</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((s) => (
                        <div
                            key={s.id}
                            className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all flex flex-col justify-between group space-y-3"
                        >
                            {editingId === s.id ? (
                                // ---- Chế độ SỬA: form nằm ngay trên thẻ, thay cho nội dung xem thường ----
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        disabled={saving}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                                        placeholder="Tên môn học"
                                    />
                                    <input
                                        type="text"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        disabled={saving}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                                        placeholder="Mô tả ngắn (tùy chọn)"
                                    />
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => handleSaveEdit(s.id)}
                                            disabled={saving || !editName.trim()}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Đang lưu...' : 'Lưu'}
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                                        >
                                            Huỷ
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // ---- Chế độ XEM bình thường ----
                                <>
                                    <Link to={`/subjects/${s.id}`} className="space-y-1.5 block">
                                        <h2 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                            {s.name}
                                        </h2>
                                        {s.description ? (
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{s.description}</p>
                                        ) : (
                                            <p className="text-xs text-slate-300 italic">Chưa có mô tả</p>
                                        )}
                                    </Link>

                                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => startEdit(s)}
                                                className="text-slate-400 hover:text-indigo-600 transition-colors font-medium"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id, s.name)}
                                                disabled={deletingId === s.id}
                                                className="text-slate-400 hover:text-red-600 transition-colors font-medium disabled:opacity-50"
                                            >
                                                {deletingId === s.id ? 'Đang xoá...' : 'Xoá'}
                                            </button>
                                        </div>
                                        <Link
                                            to={`/subjects/${s.id}`}
                                            className="text-indigo-600 font-medium group-hover:translate-x-1 transition-transform"
                                        >
                                            Chi tiết →
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}