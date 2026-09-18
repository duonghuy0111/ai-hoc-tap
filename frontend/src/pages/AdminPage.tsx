import { useEffect, useState } from 'react';
import client from '../api/client';

interface SystemStats {
    totalUsers: number;
    totalSubjects: number;
    totalMaterials: number;
    totalQuizzes: number;
    totalQuizAttempts: number;
    averageScoreAcrossSystem: number | null;
}

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface ActivityLogEntry {
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
    user: { name: string; email: string };
}

type Tab = 'stats' | 'users' | 'logs';

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-800">{value}</p>
        </div>
    );
}

export default function AdminPage() {
    const [tab, setTab] = useState<Tab>('stats');
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                if (tab === 'stats') {
                    const { data } = await client.get<SystemStats>('/admin/stats');
                    setStats(data);
                } else if (tab === 'users') {
                    const { data } = await client.get('/admin/users');
                    setUsers(data.items);
                } else {
                    const { data } = await client.get('/admin/activity-logs');
                    setLogs(data.items);
                }
            } catch (err: any) {
                if (err.response?.status === 403) {
                    setError('Bạn không có quyền truy cập trang này (yêu cầu quyền admin).');
                } else {
                    setError('Không tải được dữ liệu. Vui lòng thử lại.');
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [tab]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-slate-800">Trang quản trị</h1>
                <p className="text-sm text-slate-400 mt-0.5">Chỉ dành cho tài khoản có quyền admin</p>
            </div>

            <div className="flex gap-1 border-b border-slate-200">
                {(['stats', 'users', 'logs'] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {t === 'stats' ? 'Thống kê hệ thống' : t === 'users' ? 'Người dùng' : 'Nhật ký hoạt động'}
                    </button>
                ))}
            </div>

            {loading && <p className="text-sm text-slate-400 text-center py-8">Đang tải...</p>}
            {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

            {!loading && !error && tab === 'stats' && stats && (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <StatCard label="Tổng số người dùng" value={stats.totalUsers} />
                    <StatCard label="Tổng số môn học" value={stats.totalSubjects} />
                    <StatCard label="Tổng số tài liệu" value={stats.totalMaterials} />
                    <StatCard label="Tổng số quiz đã tạo" value={stats.totalQuizzes} />
                    <StatCard label="Tổng lượt làm bài" value={stats.totalQuizAttempts} />
                    <StatCard
                        label="Điểm TB toàn hệ thống"
                        value={stats.averageScoreAcrossSystem !== null ? stats.averageScoreAcrossSystem.toFixed(1) : '—'}
                    />
                </div>
            )}

            {!loading && !error && tab === 'users' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-2.5">Tên</th>
                                <th className="text-left px-4 py-2.5">Email</th>
                                <th className="text-left px-4 py-2.5">Vai trò</th>
                                <th className="text-left px-4 py-2.5">Ngày tạo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="px-4 py-2.5 text-slate-700">{u.name}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                                    <td className="px-4 py-2.5">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-md font-medium ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <p className="text-center text-slate-400 text-sm py-6">Chưa có người dùng nào.</p>}
                </div>
            )}

            {!loading && !error && tab === 'logs' && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">
                    {logs.map((l) => (
                        <div key={l.id} className="px-4 py-3 flex justify-between items-center text-sm">
                            <div>
                                <p className="text-slate-700">
                                    <span className="font-medium">{l.user.name}</span>{' '}
                                    <span className="text-slate-400">({l.user.email})</span>
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {l.action}
                                    {l.entityType ? ` · ${l.entityType}` : ''}
                                </p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                {new Date(l.createdAt).toLocaleString('vi-VN')}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-center text-slate-400 text-sm py-6">Chưa có hoạt động nào.</p>}
                </div>
            )}
        </div>
    );
}
